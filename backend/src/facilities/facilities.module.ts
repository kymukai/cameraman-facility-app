import { Module } from '@nestjs/common';
import { FacilitiesController } from './facilities.controller';
import { ExternalFacilitiesController } from './external-facilities.controller';
import { FacilitiesService } from './facilities.service';

@Module({
  controllers: [FacilitiesController, ExternalFacilitiesController],
  providers: [FacilitiesService],
})
export class FacilitiesModule {}
