import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

const DEFAULT_LIMIT = 20;
const DEFAULT_WINDOW_SECONDS = 600;
const MAX_TRACKED = 10_000;

/**
 * Limits document uploads per client IP: `UPLOAD_RATE_LIMIT` uploads (default 20) in each
 * `UPLOAD_RATE_WINDOW_SECONDS` (default 600). Counts live in memory, so each function instance
 * keeps its own. That is enough to stop one client filling the bucket.
 * `request.ip` comes from `x-forwarded-for`, so `trust proxy` must be set (see configure-app.ts).
 */
export function uploadRateLimit(config: ConfigService) {
  const limit = Number(config.get('UPLOAD_RATE_LIMIT')) || DEFAULT_LIMIT;
  const windowMs =
    (Number(config.get('UPLOAD_RATE_WINDOW_SECONDS')) ||
      DEFAULT_WINDOW_SECONDS) * 1000;
  const logger = new Logger('UploadRateLimit');
  const counts = new Map<string, { count: number; resetAt: number }>();

  return (request: Request, response: Response, next: NextFunction) => {
    if (request.method !== 'PUT') return next();

    const now = Date.now();
    if (counts.size > MAX_TRACKED) {
      for (const [ip, entry] of counts) if (entry.resetAt <= now) counts.delete(ip);
    }

    const ip = request.ip ?? 'unknown';
    let entry = counts.get(ip);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      counts.set(ip, entry);
    }
    entry.count += 1;

    if (entry.count > limit) {
      logger.warn(`Upload refused for ${ip}: over ${limit} in the window`);
      response
        .status(429)
        .set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)))
        .json({ error: 'rate_limited' });
      return;
    }
    next();
  };
}
