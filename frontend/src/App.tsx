import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  createItem,
  deleteItem,
  listItems,
  type Item,
} from "./api";

export default function App() {
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-slate-800">cameraman-facility-app</h1>
      </header>

      <main className="mx-auto max-w-3xl p-6">
        <ItemsPanel />
      </main>
    </div>
  );
}

// Items の一覧・作成・削除
function ItemsPanel() {
  const [items, setItems] = useState<Item[]>([]);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setError(null);
    try {
      setItems(await listItems());
    } catch (err) {
      setError(err instanceof Error ? err.message : "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createItem({ title: title.trim(), note: note.trim() });
      setTitle("");
      setNote("");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "作成に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      await deleteItem(id);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "削除に失敗しました");
    }
  }

  return (
    <section className="space-y-6">
      <h2 className="text-base font-semibold text-slate-700">Items</h2>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form
        onSubmit={handleCreate}
        className="space-y-3 rounded-xl bg-white p-4 shadow"
      >
        <input
          type="text"
          placeholder="タイトル"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
        <textarea
          placeholder="メモ"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {busy ? "作成中..." : "追加"}
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-slate-500">読み込み中...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-500">item がありません。</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between rounded-xl bg-white p-4 shadow"
            >
              <div>
                <p className="font-medium text-slate-800">{item.title}</p>
                {item.note && (
                  <p className="mt-1 text-sm text-slate-600">{item.note}</p>
                )}
                <p className="mt-1 text-xs text-slate-400">
                  {new Date(item.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => void handleDelete(item.id)}
                className="rounded-md border border-red-200 px-3 py-1 text-sm text-red-600 hover:bg-red-50"
              >
                削除
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
