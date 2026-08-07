import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { ItemsModule } from './items/items.module';

@Module({
  imports: [ItemsModule],
  controllers: [HealthController],
})
export class AppModule {}
