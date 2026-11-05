import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { maxUploadBytes } from './documents/upload-limit.js';

export const DEFAULT_ALLOWED_ORIGIN = 'http://localhost:5173';

// Shared by main.ts, firebase.ts and the e2e tests, so the tests run the real HTTP setup.
export function configureApp(app: NestExpressApplication) {
  const config = app.get(ConfigService);
  app.enableCors({
    // Comma-separated, e.g. "http://localhost:5173,https://eth-global-c6363.web.app".
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
