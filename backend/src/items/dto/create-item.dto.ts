import { IsOptional, IsString, MaxLength } from 'class-validator';

// Item 作成リクエストの DTO。
export class CreateItemDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
