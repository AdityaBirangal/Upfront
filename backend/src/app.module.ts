import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { ChainModule } from './chain/chain.module.js';
import { DocumentsModule } from './documents/documents.module.js';
import { HttpExceptionFilter } from './http-exception.filter.js';
import { WorldModule } from './world/world.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ChainModule,
    DocumentsModule,
    WorldModule,
  ],
  controllers: [AppController],
  providers: [{ provide: APP_FILTER, useClass: HttpExceptionFilter }],
})
export class AppModule {}
