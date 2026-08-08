import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { Facility, FacilitiesService } from './facilities.service';

// /api/external/facilities 配下。社内の他システムとの連携用に一部データをGETするAPI。
// 認証は未実装（TODO）。将来 Guard を追加する際にルートを分離しやすくするため、
// 社内UI向けの FacilitiesController とはコントローラー自体を分けている。
@Controller('external/facilities')
export class ExternalFacilitiesController {
  constructor(private readonly facilities: FacilitiesService) {}

  // 施設IDを完全一致で指定して1件取得。
  @Get()
  async getByFacilityId(@Query('facilityId') facilityIdRaw?: string) {
    if (!facilityIdRaw) {
      throw new BadRequestException('facilityId は必須です');
    }
    const facilityId = Number(facilityIdRaw);
    if (!Number.isInteger(facilityId)) {
      throw new BadRequestException('facilityId は整数で指定してください');
    }

    const facility = await this.facilities.getByFacilityId(facilityId);
    return toExternalFacility(facility);
  }
}

// 外部連携用レスポンス。内部id（内部管理用の主キー）は含めない。
function toExternalFacility(facility: Facility) {
  return {
    facilityId: facility.facilityId,
    facilityName: facility.facilityName,
    salesStartDefault: facility.salesStartDefault,
    salesStartDate: facility.salesStartDate,
    salesPrice: facility.salesPrice,
    updatedAt: facility.updatedAt,
  };
}
