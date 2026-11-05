import express from 'express';
import { NestFactory } from '@nestjs/core';
import {
  ExpressAdapter,
  type NestExpressApplication,
} from '@nestjs/platform-express';
import { onRequest } from 'firebase-functions/v2/https';
import { AppModule } from './app.module.js';
import { configureApp } from './configure-app.js';

// Cloud Functions entry point. main.ts stays the local dev server.
const server = express();
let ready: Promise<void> | undefined;

// Built on the first request, not at import, because the Firebase CLI imports
// this file during deploy just to find the exported functions.
function boot() {
  ready ??= (async () => {
    const app = await NestFactory.create<NestExpressApplication>(
      AppModule,
      new ExpressAdapter(server),
    );
    configureApp(app);
    await app.init();
  })().catch((error: unknown) => {
    ready = undefined; // let the next request retry
    throw error;
  });
  return ready;
}

export const api = onRequest(
  {
    region: 'us-central1',
    memory: '512MiB',
    maxInstances: 5,
    invoker: 'public',
  },
  async (request, response) => {
    await boot();
    server(request, response);
  },
);
