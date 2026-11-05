import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Inject,
  Param,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { DocumentsService } from './documents.service.js';

@Controller('documents')
export class DocumentsController {
  constructor(
    @Inject(DocumentsService) private readonly documents: DocumentsService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: { hash?: unknown } | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { created, document } = await this.documents.upload(
      body?.hash,
      file?.buffer,
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
