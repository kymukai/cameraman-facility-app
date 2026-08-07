import { INestApplication, ValidationPipe } from '@nestjs/common';
import { buildCorsOptions } from './cors-options';

// ローカル(main.ts)と Lambda(lambda.ts)で共通のアプリ設定を適用する。
export function configureApp(app: INestApplication): void {
  // 全ルートに /api プレフィックスを付与
  app.setGlobalPrefix('api');

  // DTO バリデーションを有効化
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // CORS 設定
  app.enableCors(buildCorsOptions());
}
