import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

const CODES: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'bad_request',
  [HttpStatus.NOT_FOUND]: 'not_found',
  [HttpStatus.PAYLOAD_TOO_LARGE]: 'too_large',
  [HttpStatus.TOO_MANY_REQUESTS]: 'rate_limited',
};

// Errors from Express middleware, such as the body parser, carry a plain status.
function statusOf(exception: unknown): number {
  if (exception instanceof HttpException) return exception.getStatus();
  const status = (exception as { status?: unknown } | null)?.status;
  return typeof status === 'number' && status >= 400 && status < 500
    ? status
    : HttpStatus.INTERNAL_SERVER_ERROR;
}

// Every error leaves as { error: "code" }, replacing Nest's { statusCode, message }.
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const status = statusOf(exception);
    const http = host.switchToHttp();
    const { method, originalUrl } = http.getRequest<Request>();
    if (status >= 500) {
      this.logger.error(`${method} ${originalUrl} failed with ${status}`, exception);
    } else {
      const message = exception instanceof Error ? exception.message : String(exception);
      this.logger.warn(`${method} ${originalUrl} refused with ${status}: ${message}`);
    }

    // Codes thrown by this app are lowercase, unlike Nest's "Bad Request".
    const body =
      exception instanceof HttpException ? exception.getResponse() : null;
    const thrown = (body as { error?: unknown } | null)?.error;
    const error =
      typeof thrown === 'string' && /^[a-z_]+$/.test(thrown)
        ? thrown
        : (CODES[status] ??
          (status >= 500 ? 'internal_error' : 'request_failed'));

    http.getResponse<Response>().status(status).json({ error });
  }
}
