import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { maxUploadBytes } from './documents/upload-limit.js';
import { uploadRateLimit } from './documents/upload-rate-limit.js';

export const DEFAULT_ALLOWED_ORIGIN = 'http://localhost:5173';

// Shared by main.ts, firebase.ts and the e2e tests, so the tests run the real HTTP setup.
export function configureApp(app: NestExpressApplication) {
  const config = app.get(ConfigService);
  // Google's front end appends the caller's IP to x-forwarded-for. Trusting only that last hop
  // means a client can't pick its own IP by sending the header. TRUST_PROXY_HOPS=0 turns it off.
  app.set('trust proxy', Number(config.get('TRUST_PROXY_HOPS') ?? 1));
  app.use('/documents', uploadRateLimit(config));
  app.enableCors({
    // Comma-separated, e.g. "http://localhost:5173,https://upfront.web.app".
    origin: config
      .get<string>('ALLOWED_ORIGIN', DEFAULT_ALLOWED_ORIGIN)
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  });
  // Uploads are a raw PDF body. On Cloud Functions the body is already read, and
  // this parser skips it.
  app.useBodyParser('raw', {
    type: 'application/pdf',
    limit: maxUploadBytes(config),
  });
}
