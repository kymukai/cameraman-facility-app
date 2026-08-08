import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { FacilitiesService } from './facilities.service';
import { CreateFacilityDto } from './dto/create-facility.dto';
import { UpdateFacilityDto } from './dto/update-facility.dto';

// /api/facilities 配下。社内向けの新規登録・検索・修正 UI が使う。
@Controller('facilities')
export class FacilitiesController {
  constructor(private readonly facilities: FacilitiesService) {}

  // 検索（施設ID完全一致 / 施設名部分一致、併用可）
  @Get()
  search(
    @Query('facilityId') facilityIdRaw?: string,
    @Query('facilityName') facilityName?: string,
  ) {
    const facilityId = parseFacilityIdParam(facilityIdRaw);
    return this.facilities.search({ facilityId, facilityName });
  }

  // 詳細（編集フォーム表示用）
  @Get(':id')
  get(@Param('id') id: string) {
    return this.facilities.getById(id);
  }

  // 新規登録
  @Post()
  create(@Body() dto: CreateFacilityDto) {
    return this.facilities.create(dto);
  }

  // 検索結果からの設定項目修正
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFacilityDto) {
    return this.facilities.update(id, dto);
  }
}

function parseFacilityIdParam(raw: string | undefined): number | undefined {
  if (raw === undefined || raw === '') return undefined;
  const value = Number(raw);
  if (!Number.isInteger(value)) {
    throw new BadRequestException('facilityId は整数で指定してください');
  }
  return value;
}
