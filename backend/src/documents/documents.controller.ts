import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Put,
  Req,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { DocumentsService } from './documents.service.js';

// Cloud Functions reads the body before Express and leaves it in rawBody.
// Locally, the raw body parser from configureApp puts a Buffer in body.
function bodyBytes(request: Request): Buffer | undefined {
  const { rawBody } = request as Request & { rawBody?: unknown };
  if (Buffer.isBuffer(rawBody)) return rawBody;
  return Buffer.isBuffer(request.body) ? request.body : undefined;
}

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  // The body is the raw PDF. Multipart doesn't work on Cloud Functions.
  @Put(':hash')
  async upload(
    @Param('hash') hash: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (!request.is('application/pdf')) {
      throw new HttpException(
        { error: 'not_pdf' },
        HttpStatus.UNSUPPORTED_MEDIA_TYPE,
      );
    }
    const { created, document } = await this.documents.upload(
      hash,
      bodyBytes(request),
    );
    response.status(created ? HttpStatus.CREATED : HttpStatus.OK);
    return document;
  }

  @Get(':hash')
  async read(@Param('hash') hash: string) {
    const bytes = await this.documents.read(hash);
    return new StreamableFile(bytes, {
      type: 'application/pdf',
      length: bytes.length,
    });
  }
}
