import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

// Facility 作成リクエストの DTO。
// salesStartDate と salesStartDefault の整合性（true のとき salesStartDate 不可）は
// class-validator の条件分岐では表現しづらいため FacilitiesService 側で検証する。
export class CreateFacilityDto {
  @IsInt()
  @Min(1)
  facilityId!: number;

  @IsString()
  @MaxLength(200)
  facilityName!: string;

  @IsBoolean()
  salesStartDefault!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  salesStartDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  salesPrice?: string;
}
