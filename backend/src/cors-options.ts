import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

// CORS_ORIGIN（カンマ区切り）をパースして CorsOptions を返す。
// 値が未設定 or "*" の場合は全オリジン許可。
export function buildCorsOptions(): CorsOptions {
  const raw = (process.env.CORS_ORIGIN ?? '*').trim();

  if (raw === '' || raw === '*') {
    return {
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    };
  }

  const origins = raw
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o.length > 0);

  return {
    origin: origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  };
}
