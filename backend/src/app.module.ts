import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { FacilitiesModule } from './facilities/facilities.module';

@Module({
  imports: [FacilitiesModule],
  controllers: [HealthController],
})
export class AppModule {}
