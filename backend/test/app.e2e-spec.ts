import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/configure-app.js';

const ALLOWED_ORIGIN = 'https://app.upfront.test';

describe('Health (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    vi.stubEnv('ALLOWED_ORIGIN', ALLOWED_ORIGIN);
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    vi.unstubAllEnvs();
  });

  it('GET /health returns { ok: true }', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ ok: true });
  });

  it('allows the configured origin', () => {
    return request(app.getHttpServer())
      .get('/health')
      .set('Origin', ALLOWED_ORIGIN)
      .expect('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  });

  it('does not allow another origin', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .set('Origin', 'https://evil.test');

    expect(response.headers['access-control-allow-origin']).not.toBe(
      'https://evil.test',
    );
  });

  it('no longer serves the scaffold route', () => {
    return request(app.getHttpServer()).get('/').expect(404);
  });
});
