import { createHash } from 'node:crypto';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';
import { ChainService } from './../src/chain/chain.service.js';
import { configureApp } from './../src/configure-app.js';

const ALLOWED_ORIGIN = 'https://app.upfront.test';
const MAX_UPLOAD_BYTES = 2048;
const SAMPLE_PDF = new URL(
  '../../frontend/public/sample-agreement.pdf',
  import.meta.url,
);

const sha256 = (bytes: Buffer) =>
  `0x${createHash('sha256').update(bytes).digest('hex')}`;

describe('Backend (e2e)', () => {
  let app: NestExpressApplication<App>;
  let dataDir: string;
  let pdf: Buffer;

  const server = () => app.getHttpServer();
  const upload = (bytes: Buffer, hash: string) =>
    request(server())
      .put(`/documents/${hash}`)
      .set('Content-Type', 'application/pdf')
      .send(bytes);

  beforeEach(async () => {
    pdf = await readFile(SAMPLE_PDF);
    dataDir = await mkdtemp(join(tmpdir(), 'upfront-docs-'));
    vi.stubEnv('ALLOWED_ORIGIN', ALLOWED_ORIGIN);
    vi.stubEnv('DATA_DIR', dataDir);
    vi.stubEnv('MAX_UPLOAD_BYTES', String(MAX_UPLOAD_BYTES));
    vi.stubEnv('CHAIN_ID', '31337');
    vi.stubEnv('RPC_URL', 'http://127.0.0.1:1');
    vi.stubEnv('UPFRONT_ADDRESS', '');
    vi.stubEnv('ACCESS_ADDRESS', '');

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    await rm(dataDir, { recursive: true, force: true });
    vi.unstubAllEnvs();
  });

  describe('health', () => {
    it('stays ok with null versions when nothing is deployed', async () => {
      // A chain with no entry in deployments.json.
      vi.stubEnv('CHAIN_ID', '999999');
      const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();
      const bare = moduleRef.createNestApplication<NestExpressApplication>();
      configureApp(bare);
      await bare.init();
      await request(bare.getHttpServer()).get('/health').expect(200).expect({
        ok: true,
        chainId: 999999,
        upfront: null,
        upfrontVersion: null,
        accessVersion: null,
      });
      await bare.close();
    });

    it('stays ok when the RPC is unreachable', async () => {
      vi.stubEnv('UPFRONT_ADDRESS', `0x${'11'.repeat(20)}`);
      const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();
      const chain = moduleRef.get(ChainService);

      await expect(chain.status()).resolves.toMatchObject({
        upfront: `0x${'11'.repeat(20)}`,
        upfrontVersion: null,
      });
    });

    it('allows the configured origin', () => {
      return request(server())
        .get('/health')
        .set('Origin', ALLOWED_ORIGIN)
        .expect('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    });

    it('does not allow another origin', async () => {
      const response = await request(server())
        .get('/health')
        .set('Origin', 'https://evil.test');

      expect(response.headers['access-control-allow-origin']).not.toBe(
        'https://evil.test',
      );
    });
  });

  describe('documents', () => {
    it('returns identical bytes after upload', async () => {
      const hash = sha256(pdf);
      const created = await upload(pdf, hash).expect(201);

      expect(created.body).toEqual({
        hash,
        size: pdf.length,
        uploadedAt: expect.any(String),
      });

      const fetched = await request(server())
        .get(`/documents/${hash}`)
        .responseType('blob')
        .expect(200)
        .expect('Content-Type', 'application/pdf');

      expect(Buffer.compare(fetched.body as Buffer, pdf)).toBe(0);
      expect(sha256(fetched.body as Buffer)).toBe(hash);
    });

    it('stores <hash>.pdf and <hash>.json with no temp files left', async () => {
      const hash = sha256(pdf);
      await upload(pdf, hash).expect(201);

      expect((await readdir(dataDir)).sort()).toEqual([
        `${hash}.json`,
        `${hash}.pdf`,
      ]);
      const meta = JSON.parse(
        await readFile(join(dataDir, `${hash}.json`), 'utf8'),
      ) as unknown;
      expect(meta).toEqual({
        size: pdf.length,
        uploadedAt: expect.any(String),
      });
    });

    it('returns 200 with the original record on a second upload', async () => {
      const hash = sha256(pdf);
      const first = await upload(pdf, hash).expect(201);
      const second = await upload(pdf, hash).expect(200);

      expect(second.body).toEqual(first.body);
    });

    it('rejects a hash that does not match the file', async () => {
      const wrong = `0x${'ab'.repeat(32)}`;
      await upload(pdf, wrong).expect(400).expect({ error: 'hash_mismatch' });
      expect(await readdir(dataDir)).toEqual([]);
    });

    it('rejects a non-PDF by its header, whatever its type says', async () => {
      const text = Buffer.from('not a pdf');
      await upload(text, sha256(text)).expect(415).expect({ error: 'not_pdf' });
    });

    it('rejects an empty body as missing_file', async () => {
      const empty = Buffer.alloc(0);
      await upload(empty, sha256(empty))
        .expect(400)
        .expect({ error: 'missing_file' });
    });

    it('rejects an oversized file with too_large', async () => {
      const big = Buffer.concat([
        Buffer.from('%PDF-'),
        Buffer.alloc(MAX_UPLOAD_BYTES),
      ]);
      await upload(big, sha256(big)).expect(413).expect({ error: 'too_large' });
    });

    it('accepts a file exactly at the limit', async () => {
      const exact = Buffer.concat([
        Buffer.from('%PDF-'),
        Buffer.alloc(MAX_UPLOAD_BYTES - 5),
      ]);
      await upload(exact, sha256(exact)).expect(201);
    });

    it.each([
      ['no prefix', 'ab'.repeat(32)],
      ['uppercase', `0x${'AB'.repeat(32)}`],
      ['too short', '0xabcd'],
      ['encoded traversal', '..%2F..%2Fpackage.json'],
    ])('rejects an upload with an invalid hash: %s', async (_name, hash) => {
      await upload(pdf, hash).expect(400).expect({ error: 'invalid_hash' });
    });

    it('rejects an upload with no body', async () => {
      await request(server())
        .put(`/documents/${sha256(pdf)}`)
        .set('Content-Type', 'application/pdf')
        .expect(400)
        .expect({ error: 'missing_file' });
    });

    it('rejects a body sent with the wrong content type', async () => {
      await request(server())
        .put(`/documents/${sha256(pdf)}`)
        .set('Content-Type', 'application/octet-stream')
        .send(pdf)
        .expect(415)
        .expect({ error: 'not_pdf' });
    });

    it('rejects a multipart upload', async () => {
      await request(server())
        .put(`/documents/${sha256(pdf)}`)
        .attach('file', pdf, 'agreement.pdf')
        .expect(415)
        .expect({ error: 'not_pdf' });
    });

    it('rejects malformed JSON in the plan error shape', async () => {
      await request(server())
        .put(`/documents/${sha256(pdf)}`)
        .set('Content-Type', 'application/json')
        .send('{oops')
        .expect(400)
        .expect({ error: 'bad_request' });
    });

    it('returns 404 for an unknown document', async () => {
      await request(server())
        .get(`/documents/0x${'cd'.repeat(32)}`)
        .expect(404)
        .expect({ error: 'not_found' });
    });

    it.each([
      ['uppercase', `0x${'AB'.repeat(32)}`],
      ['encoded traversal', '..%2F..%2Fpackage.json'],
      ['encoded null byte', `0x${'ab'.repeat(32)}%00`],
    ])('refuses a bad fetch hash: %s', async (_name, hash) => {
      await request(server())
        .get(`/documents/${hash}`)
        .expect(400)
        .expect({ error: 'invalid_hash' });
    });

    it('serves PDFs inline with nosniff', async () => {
      const hash = sha256(pdf);
      await upload(pdf, hash).expect(201);

      await request(server())
        .get(`/documents/${hash}`)
        .expect(200)
        .expect('X-Content-Type-Options', 'nosniff')
        .expect('Content-Disposition', `inline; filename="${hash}.pdf"`);
    });
  });

  describe('upload rate limit', () => {
    let limited: NestExpressApplication<App>;

    beforeEach(async () => {
      vi.stubEnv('UPLOAD_RATE_LIMIT', '2');
      const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();
      limited = moduleRef.createNestApplication<NestExpressApplication>();
      configureApp(limited);
      await limited.init();
    });

    afterEach(() => limited.close());

    const uploadFrom = (ip: string) =>
      request(limited.getHttpServer())
        .put(`/documents/${sha256(pdf)}`)
        .set('Content-Type', 'application/pdf')
        .set('X-Forwarded-For', ip)
        .send(pdf);

    it('refuses an IP over the limit, but not another IP', async () => {
      await uploadFrom('203.0.113.1').expect(201);
      await uploadFrom('203.0.113.1').expect(200);
      await uploadFrom('203.0.113.1')
        .expect(429)
        .expect({ error: 'rate_limited' })
        .expect('Retry-After', /^\d+$/);
      await uploadFrom('203.0.113.2').expect(200);
    });

    it('uses the last x-forwarded-for hop, so a client cannot spoof it', async () => {
      await uploadFrom('1.1.1.1, 203.0.113.9').expect(201);
      await uploadFrom('2.2.2.2, 203.0.113.9').expect(200);
      await uploadFrom('3.3.3.3, 203.0.113.9').expect(429);
    });

    it('does not count document reads', async () => {
      const server = limited.getHttpServer();
      await uploadFrom('203.0.113.3').expect(201);
      for (let i = 0; i < 3; i++) {
        await request(server)
          .get(`/documents/${sha256(pdf)}`)
          .set('X-Forwarded-For', '203.0.113.3')
          .expect(200);
      }
      await uploadFrom('203.0.113.3').expect(200);
    });
  });

  it('returns unknown routes in the plan error shape', () => {
    return request(server())
      .get('/')
      .expect(404)
      .expect({ error: 'not_found' });
  });
});
