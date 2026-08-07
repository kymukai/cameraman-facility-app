import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { CreateItemDto } from './dto/create-item.dto';

// Item レコード。
export interface Item {
  id: string;
  title: string;
  note?: string;
  createdAt: string;
}

// PostgreSQL 実装。DATABASE_URL で接続し、起動時にテーブルを自動作成する。
// テンプレートなので ORM を使わず pg を直接使う素直な構成。
@Injectable()
export class ItemsService implements OnModuleInit {
  private readonly pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ?? 'postgres://app:app@localhost:5432/app',
  });

  async onModuleInit(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS items (
        id         text PRIMARY KEY,
        title      text NOT NULL,
        note       text,
        created_at timestamptz NOT NULL
      )
    `);
  }

  // 一覧（createdAt 降順）
  async list(): Promise<Item[]> {
    const res = await this.pool.query(
      'SELECT id, title, note, created_at FROM items ORDER BY created_at DESC',
    );
    return res.rows.map(toItem);
  }

  // 詳細取得
  async getById(id: string): Promise<Item> {
    const res = await this.pool.query(
      'SELECT id, title, note, created_at FROM items WHERE id = $1',
      [id],
    );
    if (res.rowCount === 0) throw new NotFoundException('item が見つかりません');
    return toItem(res.rows[0]);
  }

  // 作成
  async create(dto: CreateItemDto): Promise<Item> {
    const item: Item = {
      id: randomUUID(),
      title: dto.title,
      note: dto.note,
      createdAt: new Date().toISOString(),
    };
    await this.pool.query(
      'INSERT INTO items (id, title, note, created_at) VALUES ($1, $2, $3, $4)',
      [item.id, item.title, item.note ?? null, item.createdAt],
    );
    return item;
  }

  // 削除
  async remove(id: string): Promise<void> {
    const res = await this.pool.query('DELETE FROM items WHERE id = $1', [id]);
    if (res.rowCount === 0) throw new NotFoundException('item が見つかりません');
  }
}

// DB 行 → Item 変換
function toItem(row: any): Item {
  return {
    id: row.id,
    title: row.title,
    note: row.note ?? undefined,
    createdAt: new Date(row.created_at).toISOString(),
  };
}
