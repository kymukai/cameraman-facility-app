import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { CreateFacilityDto } from './dto/create-facility.dto';
import { UpdateFacilityDto } from './dto/update-facility.dto';

// Postgres の unique_violation エラーコード。
const PG_UNIQUE_VIOLATION = '23505';

// Facility レコード。
export interface Facility {
  id: string;
  facilityId: number;
  facilityName: string;
  salesStartDefault: boolean;
  salesStartDate?: string;
  salesPrice?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SearchFacilitiesQuery {
  facilityId?: number;
  facilityName?: string;
}

@Injectable()
export class FacilitiesService implements OnModuleInit {
  private readonly pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ?? 'postgres://app:app@localhost:5432/app',
  });

  async onModuleInit(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS facilities (
        id                    text PRIMARY KEY,
        facility_id           integer NOT NULL,
        facility_name         text NOT NULL,
        sales_start_default   boolean NOT NULL,
        sales_start_date      text,
        sales_price           text,
        created_at            timestamptz NOT NULL,
        updated_at            timestamptz NOT NULL
      )
    `);
    await this.pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS facilities_facility_id_key
        ON facilities (facility_id)
    `);
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS facilities_facility_name_idx
        ON facilities (facility_name)
    `);
  }

  // 検索（施設ID完全一致 / 施設名部分一致、併用可）。createdAt 降順。
  async search(query: SearchFacilitiesQuery): Promise<Facility[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.facilityId !== undefined) {
      params.push(query.facilityId);
      conditions.push(`facility_id = $${params.length}`);
    }
    if (query.facilityName) {
      params.push(`%${query.facilityName}%`);
      conditions.push(`facility_name ILIKE $${params.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const res = await this.pool.query(
      `SELECT * FROM facilities ${where} ORDER BY created_at DESC`,
      params,
    );
    return res.rows.map(toFacility);
  }

  // 詳細取得（内部id指定、編集フォーム表示用）
  async getById(id: string): Promise<Facility> {
    const res = await this.pool.query('SELECT * FROM facilities WHERE id = $1', [id]);
    if (res.rowCount === 0) throw new NotFoundException('facility が見つかりません');
    return toFacility(res.rows[0]);
  }

  // 詳細取得（施設ID完全一致、外部連携API用）
  async getByFacilityId(facilityId: number): Promise<Facility> {
    const res = await this.pool.query(
      'SELECT * FROM facilities WHERE facility_id = $1',
      [facilityId],
    );
    if (res.rowCount === 0) throw new NotFoundException('facility が見つかりません');
    return toFacility(res.rows[0]);
  }

  // 新規登録
  async create(dto: CreateFacilityDto): Promise<Facility> {
    assertSalesStartDateConsistency(dto.salesStartDefault, dto.salesStartDate);

    const now = new Date().toISOString();
    const facility: Facility = {
      id: randomUUID(),
      facilityId: dto.facilityId,
      facilityName: dto.facilityName,
      salesStartDefault: dto.salesStartDefault,
      salesStartDate: dto.salesStartDate,
      salesPrice: dto.salesPrice,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await this.pool.query(
        `INSERT INTO facilities
           (id, facility_id, facility_name, sales_start_default, sales_start_date, sales_price, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          facility.id,
          facility.facilityId,
          facility.facilityName,
          facility.salesStartDefault,
          facility.salesStartDate ?? null,
          facility.salesPrice ?? null,
          facility.createdAt,
          facility.updatedAt,
        ],
      );
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException('施設IDが既に登録されています');
      }
      throw err;
    }

    return facility;
  }

  // 検索結果からの設定項目修正（施設IDは不変のため対象外）
  async update(id: string, dto: UpdateFacilityDto): Promise<Facility> {
    const current = await this.getById(id);

    // PATCH の部分更新セマンティクス: キー省略(undefined)は「変更なし」、
    // 空文字("")は「クリア」として区別する（省略時にJSONから消える undefined とは違い、
    // "" は明示的に送られてきた値として区別できる）。
    const merged: Facility = {
      ...current,
      facilityName: dto.facilityName ?? current.facilityName,
      salesStartDefault: dto.salesStartDefault ?? current.salesStartDefault,
      salesStartDate:
        dto.salesStartDate !== undefined ? dto.salesStartDate || undefined : current.salesStartDate,
      salesPrice: dto.salesPrice !== undefined ? dto.salesPrice || undefined : current.salesPrice,
      updatedAt: new Date().toISOString(),
    };

    assertSalesStartDateConsistency(merged.salesStartDefault, merged.salesStartDate);

    await this.pool.query(
      `UPDATE facilities SET
         facility_name = $1,
         sales_start_default = $2,
         sales_start_date = $3,
         sales_price = $4,
         updated_at = $5
       WHERE id = $6`,
      [
        merged.facilityName,
        merged.salesStartDefault,
        merged.salesStartDate ?? null,
        merged.salesPrice ?? null,
        merged.updatedAt,
        id,
      ],
    );

    return merged;
  }
}

// 販売開始日デフォルトが true のときは販売開始日を指定できない。
function assertSalesStartDateConsistency(
  salesStartDefault: boolean,
  salesStartDate: string | undefined,
): void {
  if (salesStartDefault && salesStartDate) {
    throw new BadRequestException(
      '販売開始日デフォルトが true の場合、販売開始日は指定できません',
    );
  }
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === PG_UNIQUE_VIOLATION
  );
}

// DB 行 → Facility 変換
function toFacility(row: any): Facility {
  return {
    id: row.id,
    facilityId: row.facility_id,
    facilityName: row.facility_name,
    salesStartDefault: row.sales_start_default,
    salesStartDate: row.sales_start_date ?? undefined,
    salesPrice: row.sales_price ?? undefined,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}
