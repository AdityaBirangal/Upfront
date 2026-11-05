import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { DocumentStorage } from './document-storage.js';
import { DocumentsController } from './documents.controller.js';
import { DocumentsService } from './documents.service.js';
import { LocalDiskStorage } from './local-disk-storage.js';

const DEFAULT_MAX_UPLOAD_BYTES = 5_242_880;

@Module({
  imports: [
    // With no `dest` or `storage`, multer keeps the file in memory.
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        limits: {
          fileSize:
            Number(config.get('MAX_UPLOAD_BYTES')) || DEFAULT_MAX_UPLOAD_BYTES,
        },
      }),
    }),
  ],
  controllers: [DocumentsController],
  providers: [
    DocumentsService,
    { provide: DocumentStorage, useClass: LocalDiskStorage },
  ],
})
export class DocumentsModule {}
