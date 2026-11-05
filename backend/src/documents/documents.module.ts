import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentStorage } from './document-storage.js';
import { DocumentsController } from './documents.controller.js';
import { DocumentsService } from './documents.service.js';
import { createFirebaseDocumentStorage } from './firebase-document-storage.js';
import { LocalDiskStorage } from './local-disk-storage.js';

@Module({
  controllers: [DocumentsController],
  providers: [
    DocumentsService,
    {
      // STORAGE=firebase when deployed. Anything else uses the local disk.
      provide: DocumentStorage,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.get('STORAGE') === 'firebase'
          ? createFirebaseDocumentStorage(
              config.get<string>('STORAGE_BUCKET') || undefined,
            )
          : new LocalDiskStorage(config),
    },
  ],
})
export class DocumentsModule {}
