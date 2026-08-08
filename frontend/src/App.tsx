import { useEffect, useState, type FormEvent } from "react";
import {
  createFacility,
  searchFacilities,
  updateFacility,
  type Facility,
} from "./api";

export default function App() {
  const [refreshToken, setRefreshToken] = useState(0);

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-slate-800">cameraman-facility-app</h1>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 p-6">
        <RegisterPanel onRegistered={() => setRefreshToken((n) => n + 1)} />
        <SearchPanel refreshToken={refreshToken} />
      </main>
    </div>
  );
}

// フォーム欄の値
interface FacilityFormValues {
  facilityId: string;
  facilityName: string;
  salesStartDefault: boolean;
  salesStartDate: string;
  salesPrice: string;
}

const emptyFormValues: FacilityFormValues = {
  facilityId: "",
  facilityName: "",
  salesStartDefault: true,
  salesStartDate: "",
  salesPrice: "",
};

function facilityToFormValues(facility: Facility): FacilityFormValues {
  return {
    facilityId: String(facility.facilityId),
    facilityName: facility.facilityName,
    salesStartDefault: facility.salesStartDefault,
    salesStartDate: facility.salesStartDate ?? "",
    salesPrice: facility.salesPrice ?? "",
  };
}

// 新規登録・編集で共通の入力欄。
function FacilityFormFields({
  values,
  onChange,
  facilityIdEditable,
}: {
  values: FacilityFormValues;
  onChange: (values: FacilityFormValues) => void;
  facilityIdEditable: boolean;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">施設ID</label>
        <input
          type="number"
          placeholder="施設ID"
          value={values.facilityId}
          disabled={!facilityIdEditable}
          onChange={(e) => onChange({ ...values, facilityId: e.target.value })}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">施設名</label>
        <input
          type="text"
          placeholder="施設名"
          value={values.facilityName}
          onChange={(e) => onChange({ ...values, facilityName: e.target.value })}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={values.salesStartDefault}
          onChange={(e) =>
            onChange({
              ...values,
              salesStartDefault: e.target.checked,
              salesStartDate: e.target.checked ? "" : values.salesStartDate,
            })
          }
        />
        販売開始日デフォルト
      </label>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">
          販売開始日{values.salesStartDefault && "（デフォルト使用時は指定不可）"}
        </label>
        <input
          type="text"
          placeholder="例: 2026-09-01"
          value={values.salesStartDate}
          disabled={values.salesStartDefault}
          onChange={(e) => onChange({ ...values, salesStartDate: e.target.value })}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">販売価格</label>
        <input
          type="text"
          placeholder="販売価格"
          value={values.salesPrice}
          onChange={(e) => onChange({ ...values, salesPrice: e.target.value })}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
      </div>
    </div>
  );
}

// 新規登録
function RegisterPanel({ onRegistered }: { onRegistered: () => void }) {
  const [values, setValues] = useState<FacilityFormValues>(emptyFormValues);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await createFacility({
        facilityId: Number(values.facilityId),
        facilityName: values.facilityName.trim(),
        salesStartDefault: values.salesStartDefault,
        salesStartDate: values.salesStartDefault ? undefined : values.salesStartDate.trim() || undefined,
        salesPrice: values.salesPrice.trim() || undefined,
      });
      setValues(emptyFormValues);
      onRegistered();
    } catch (err) {
      setError(err instanceof Error ? err.message : "登録に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3 rounded-xl bg-white p-4 shadow">
      <h2 className="text-base font-semibold text-slate-700">新規登録</h2>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <FacilityFormFields values={values} onChange={setValues} facilityIdEditable />
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {busy ? "登録中..." : "登録"}
        </button>
      </form>
    </section>
  );
}

// 検索・検索結果からの修正
function SearchPanel({ refreshToken }: { refreshToken: number }) {
  const [facilityId, setFacilityId] = useState("");
  const [facilityName, setFacilityName] = useState("");
  const [results, setResults] = useState<Facility[]>([]);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function runSearch() {
    setError(null);
    setBusy(true);
    try {
      const rows = await searchFacilities({
        facilityId: facilityId.trim() ? Number(facilityId.trim()) : undefined,
        facilityName: facilityName.trim() || undefined,
      });
      setResults(rows);
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "検索に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  async function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    await runSearch();
  }

  // 新規登録があったとき、検索済みなら現在の条件で再検索して結果に反映する。
  useEffect(() => {
    if (searched) {
      void runSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken]);

  return (
    <section className="space-y-4 rounded-xl bg-white p-4 shadow">
      <h2 className="text-base font-semibold text-slate-700">検索</h2>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            施設ID（完全一致）
          </label>
          <input
            type="number"
            value={facilityId}
            onChange={(e) => setFacilityId(e.target.value)}
            className="w-40 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            施設名（部分一致）
          </label>
          <input
            type="text"
            value={facilityName}
            onChange={(e) => setFacilityName(e.target.value)}
            className="w-56 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {busy ? "検索中..." : "検索"}
        </button>
      </form>

      {searched && results.length === 0 && (
        <p className="text-sm text-slate-500">該当する施設がありません。</p>
      )}

      {results.length > 0 && (
        <ul className="space-y-2">
          {results.map((facility) =>
            editingId === facility.id ? (
              <EditRow
                key={facility.id}
                facility={facility}
                onCancel={() => setEditingId(null)}
                onSaved={(updated) => {
                  setResults((prev) =>
                    prev.map((f) => (f.id === updated.id ? updated : f)),
                  );
                  setEditingId(null);
                }}
              />
            ) : (
              <li
                key={facility.id}
                className="flex items-start justify-between rounded-xl border border-slate-200 p-4"
              >
                <div className="space-y-1 text-sm">
                  <p className="font-medium text-slate-800">
                    #{facility.facilityId} {facility.facilityName}
                  </p>
                  <p className="text-slate-600">
                    販売開始日デフォルト: {facility.salesStartDefault ? "true" : "false"}
                    {!facility.salesStartDefault && facility.salesStartDate && (
                      <> / 販売開始日: {facility.salesStartDate}</>
                    )}
                  </p>
                  {facility.salesPrice && (
                    <p className="text-slate-600">販売価格: {facility.salesPrice}</p>
                  )}
                  <p className="text-xs text-slate-400">
                    更新: {new Date(facility.updatedAt).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => setEditingId(facility.id)}
                  className="rounded-md border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
                >
                  編集
                </button>
              </li>
            ),
          )}
        </ul>
      )}
    </section>
  );
}

// 検索結果1件のインライン編集フォーム
function EditRow({
  facility,
  onCancel,
  onSaved,
}: {
  facility: Facility;
  onCancel: () => void;
  onSaved: (updated: Facility) => void;
}) {
  const [values, setValues] = useState<FacilityFormValues>(facilityToFormValues(facility));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSave() {
    setError(null);
    setBusy(true);
    try {
      // 編集フォームは常に全項目の現在値を送る（省略=変更なしという部分更新の
      // 曖昧さを避けるため、空にした項目は undefined ではなく "" を明示的に送る）。
      const updated = await updateFacility(facility.id, {
        facilityName: values.facilityName.trim(),
        salesStartDefault: values.salesStartDefault,
        salesStartDate: values.salesStartDefault ? "" : values.salesStartDate.trim(),
        salesPrice: values.salesPrice.trim(),
      });
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="space-y-3 rounded-xl border border-slate-300 bg-slate-50 p-4">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      <FacilityFormFields values={values} onChange={setValues} facilityIdEditable={false} />
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={busy}
          className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {busy ? "保存中..." : "保存"}
        </button>
        <button
          onClick={onCancel}
          disabled={busy}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
        >
          キャンセル
        </button>
      </div>
    </li>
  );
}
