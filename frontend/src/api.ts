// API 呼び出しの薄いラッパ。Items リソースの CRUD を提供する。

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api";

// バックエンドの item 表現
export interface Item {
  id: string;
  title: string;
  note?: string;
  createdAt: string;
}

export interface CreateItemInput {
  title: string;
  note?: string;
}

// 共通 fetch。JSON を送受信し、エラー時は例外を投げる。
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init?.headers as Record<string, string>) ?? {}),
  };
  const res = await fetch(`${apiBaseUrl}${path}`, { ...init, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// --- Items CRUD ---

export function listItems(): Promise<Item[]> {
  return request<Item[]>("/items");
}

export function getItem(id: string): Promise<Item> {
  return request<Item>(`/items/${encodeURIComponent(id)}`);
}

export function createItem(input: CreateItemInput): Promise<Item> {
  return request<Item>("/items", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function deleteItem(id: string): Promise<void> {
  return request<void>(`/items/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
