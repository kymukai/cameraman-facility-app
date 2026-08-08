// 元Excel（施設マスタ）からPostgreSQLへのデータ移行スクリプト。
//
// 実行例:
//   DATABASE_URL=postgres://app:app@localhost:5432/app node scripts/migrate-excel.mjs ./facilities.xlsx
//   （DATABASE_URL 省略時は FacilitiesService と同じ既定値 postgres://app:app@localhost:5432/app を使う）
//
// 注意: 実物のExcelファイルはまだ用意されていないため、COLUMN_MAP は仮の列名になっている。
// 実ファイルを受け取ったら、シートの1行目（ヘッダー）の実際の表記に合わせて調整すること。

import ExcelJS from 'exceljs';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';

// 左辺: Excelのヘッダー名（仮）、右辺: facilities テーブルのカラム名。
// 実ファイル入手後、左辺を実際のヘッダー名に置き換える。
const COLUMN_MAP = {
  施設ID: 'facilityId',
  施設名: 'facilityName',
  販売開始日デフォルト: 'salesStartDefault',
  販売開始日: 'salesStartDate',
  販売価格: 'salesPrice',
};

const filePath = process.argv[2] ?? process.env.EXCEL_FILE;
if (!filePath) {
  console.error('使い方: node scripts/migrate-excel.mjs <xlsxファイルパス>');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgres://app:app@localhost:5432/app',
});

async function main() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.worksheets[0];

  // 1行目（ヘッダー）から「列番号 → facilities のフィールド名」の対応を作る
  const fieldByColumn = new Map();
  worksheet.getRow(1).eachCell((cell, colNumber) => {
    const header = String(cell.value ?? '').trim();
    const field = COLUMN_MAP[header];
    if (field) fieldByColumn.set(colNumber, field);
  });

  // eachRow のコールバックは同期実行のため、先に全行を読み取ってから
  // for...of で順にDBへ upsert する（await をコールバック内で使わないため）。
  const rows = [];
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // ヘッダー行はスキップ
    const mapped = {};
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const field = fieldByColumn.get(colNumber);
      if (field) mapped[field] = cell.value;
    });
    rows.push({ rowNumber, mapped });
  });

  let imported = 0;
  let skipped = 0;

  for (const { rowNumber, mapped } of rows) {
    const error = validate(mapped);
    if (error) {
      console.warn(`[skip] row ${rowNumber}: ${error}`);
      skipped++;
      continue;
    }

    await upsert(mapped);
    imported++;
  }

  console.log(`完了: ${imported} 件登録/更新、${skipped} 件スキップ`);
  await pool.end();
}

// 最低限のバリデーション。不正な行は移行対象から除外する。
function validate(mapped) {
  if (mapped.facilityId === undefined || !Number.isFinite(Number(mapped.facilityId))) {
    return '施設ID が数値ではありません';
  }
  if (!mapped.facilityName || String(mapped.facilityName).trim() === '') {
    return '施設名 が空です';
  }
  if (mapped.salesStartDefault === undefined) {
    return '販売開始日デフォルト が空です';
  }
  const salesStartDefault = toBoolean(mapped.salesStartDefault);
  if (salesStartDefault && mapped.salesStartDate) {
    return '販売開始日デフォルトがtrueなのに販売開始日が指定されています';
  }
  return null;
}

// Excel上の TRUE/FALSE, 1/0, "はい"/"いいえ" などを boolean に変換
function toBoolean(value) {
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  return ['true', '1', 'はい', 'yes'].includes(normalized);
}

// facility_id を競合キーに upsert する
async function upsert(mapped) {
  const facilityId = Number(mapped.facilityId);
  const facilityName = String(mapped.facilityName).trim();
  const salesStartDefault = toBoolean(mapped.salesStartDefault);
  const salesStartDate = salesStartDefault ? null : (mapped.salesStartDate ?? null);
  const salesPrice = mapped.salesPrice != null ? String(mapped.salesPrice) : null;
  const now = new Date().toISOString();

  await pool.query(
    `INSERT INTO facilities
       (id, facility_id, facility_name, sales_start_default, sales_start_date, sales_price, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
     ON CONFLICT (facility_id) DO UPDATE SET
       facility_name = EXCLUDED.facility_name,
       sales_start_default = EXCLUDED.sales_start_default,
       sales_start_date = EXCLUDED.sales_start_date,
       sales_price = EXCLUDED.sales_price,
       updated_at = EXCLUDED.updated_at`,
    [randomUUID(), facilityId, facilityName, salesStartDefault, salesStartDate, salesPrice, now],
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
