import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

const CODES: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'bad_request',
  [HttpStatus.NOT_FOUND]: 'not_found',
  [HttpStatus.PAYLOAD_TOO_LARGE]: 'too_large',
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
    if (status >= 500) this.logger.error(exception);

    // Codes thrown by this app are lowercase, unlike Nest's "Bad Request".
    const body =
      exception instanceof HttpException ? exception.getResponse() : null;
    const thrown = (body as { error?: unknown } | null)?.error;
    const error =
      typeof thrown === 'string' && /^[a-z_]+$/.test(thrown)
        ? thrown
        : (CODES[status] ??
          (status >= 500 ? 'internal_error' : 'request_failed'));

    host.switchToHttp().getResponse<Response>().status(status).json({ error });
  }
}
