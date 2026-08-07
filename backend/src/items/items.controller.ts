import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';

// /api/items 配下の CRUD サンプル。新しいリソースを作るときの見本。
@Controller('items')
export class ItemsController {
  constructor(private readonly items: ItemsService) {}

  // 一覧（createdAt 降順）
  @Get()
  list() {
    return this.items.list();
  }

  // 詳細
  @Get(':id')
  get(@Param('id') id: string) {
    return this.items.getById(id);
  }

  // 作成
  @Post()
  create(@Body() dto: CreateItemDto) {
    return this.items.create(dto);
  }

  // 削除
  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string): void {
    this.items.remove(id);
  }
}
