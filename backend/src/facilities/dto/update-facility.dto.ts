import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

// Facility 更新（PATCH）リクエストの DTO。
// facilityId は不変のキーのため、あえてフィールドを持たせず更新不可にする
// （送られてきても ValidationPipe の forbidNonWhitelisted で拒否される）。
export class UpdateFacilityDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  facilityName?: string;

  @IsOptional()
  @IsBoolean()
  salesStartDefault?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  salesStartDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  salesPrice?: string;
}
