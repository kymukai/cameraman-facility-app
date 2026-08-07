import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import {
  ExpressAdapter,
  NestExpressApplication,
} from '@nestjs/platform-express';
import serverlessExpress from '@codegenie/serverless-express';
import type { Handler } from 'aws-lambda';
import express from 'express';
import { AppModule } from './app.module';
import { configureApp } from './configure-app';

// AWS へデプロイする場合の Lambda エントリ（cloudformation/ 参照）。
// ローカル動作だけなら使わない。serverless-express ハンドラをウォーム間でキャッシュする。
let cachedHandler: Handler | undefined;

async function bootstrap(): Promise<Handler> {
  const expressApp = express();
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(expressApp),
  );
  configureApp(app);
  await app.init();

  return serverlessExpress({ app: expressApp });
}

export const handler: Handler = async (event, context, callback) => {
  if (!cachedHandler) {
    cachedHandler = await bootstrap();
  }
  return cachedHandler(event, context, callback);
};
