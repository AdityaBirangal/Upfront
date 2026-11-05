import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const DEFAULT_ALLOWED_ORIGIN = 'http://localhost:5173';

// Shared by main.ts and the e2e tests, so the tests run the real HTTP setup.
export function configureApp(app: INestApplication) {
  const config = app.get(ConfigService);
  // Vercel forwards the full public path, so routes must include /api.
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: config.get<string>('ALLOWED_ORIGIN', DEFAULT_ALLOWED_ORIGIN),
  });
}
