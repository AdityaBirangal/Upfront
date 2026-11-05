import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import express from 'express';
import { Test } from '@nestjs/testing';
import {
  ExpressAdapter,
  type NestExpressApplication,
} from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/configure-app.js';

const MAX_UPLOAD_BYTES = 2048;
const SAMPLE_PDF = new URL(
  '../../frontend/public/sample-agreement.pdf',
  import.meta.url,
);

const sha256 = (bytes: Buffer) =>
  `0x${createHash('sha256').update(bytes).digest('hex')}`;

// Cloud Functions reads every body before the app sees it, keeps the bytes in
// req.rawBody, and allows up to 32 MB. This stands in for that, so the upload
// route is tested the way it runs when deployed.
function functionsLikeServer() {
  const server = express();
  server.use(
    express.raw({
      type: '*/*',
      limit: '32mb',
      verify: (req, _res, buf) => {
        (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
      },
    }),
  );
  return server;
}

describe('Uploads with a body already read (Cloud Functions)', () => {
  let app: NestExpressApplication;
  let dataDir: string;
  let pdf: Buffer;

  beforeEach(async () => {
    pdf = await readFile(SAMPLE_PDF);
    dataDir = await mkdtemp(join(tmpdir(), 'upfront-fn-'));
    vi.stubEnv('DATA_DIR', dataDir);
    vi.stubEnv('MAX_UPLOAD_BYTES', String(MAX_UPLOAD_BYTES));
    vi.stubEnv('RPC_URL', 'http://127.0.0.1:1');

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>(
      new ExpressAdapter(functionsLikeServer()),
    );
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    await rm(dataDir, { recursive: true, force: true });
    vi.unstubAllEnvs();
  });

  it('stores and returns the PDF', async () => {
    const hash = sha256(pdf);
    await request(app.getHttpServer())
      .put(`/documents/${hash}`)
      .set('Content-Type', 'application/pdf')
      .send(pdf)
      .expect(201);

    const fetched = await request(app.getHttpServer())
      .get(`/documents/${hash}`)
      .responseType('blob')
      .expect(200);
    expect(Buffer.compare(fetched.body as Buffer, pdf)).toBe(0);
  });

  it('still enforces MAX_UPLOAD_BYTES', async () => {
    const big = Buffer.concat([
      Buffer.from('%PDF-'),
      Buffer.alloc(MAX_UPLOAD_BYTES),
    ]);
    await request(app.getHttpServer())
      .put(`/documents/${sha256(big)}`)
      .set('Content-Type', 'application/pdf')
      .send(big)
      .expect(413)
      .expect({ error: 'too_large' });
  });
});
