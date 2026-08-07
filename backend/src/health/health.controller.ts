import { Controller, Get } from '@nestjs/common';

// ヘルスチェック。グローバルプレフィックスにより GET /api/health で応答。
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'cameraman-facility-app-backend',
      timestamp: new Date().toISOString(),
    };
  }
}
