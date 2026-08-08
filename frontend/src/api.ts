// API 呼び出しの薄いラッパ。Facilities リソースの登録・検索・修正を提供する。

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api";

// バックエンドの facility 表現
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

export interface CreateFacilityInput {
  facilityId: number;
  facilityName: string;
  salesStartDefault: boolean;
  salesStartDate?: string;
  salesPrice?: string;
}

// facilityId は不変のため更新対象に含めない。
export interface UpdateFacilityInput {
  facilityName?: string;
  salesStartDefault?: boolean;
  salesStartDate?: string;
  salesPrice?: string;
}

export interface SearchFacilitiesParams {
  facilityId?: number;
  facilityName?: string;
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

// --- Facilities ---

export function searchFacilities(params: SearchFacilitiesParams): Promise<Facility[]> {
  const query = new URLSearchParams();
  if (params.facilityId !== undefined) query.set("facilityId", String(params.facilityId));
  if (params.facilityName) query.set("facilityName", params.facilityName);
  const qs = query.toString();
  return request<Facility[]>(`/facilities${qs ? `?${qs}` : ""}`);
}

export function getFacility(id: string): Promise<Facility> {
  return request<Facility>(`/facilities/${encodeURIComponent(id)}`);
}

export function createFacility(input: CreateFacilityInput): Promise<Facility> {
  return request<Facility>("/facilities", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateFacility(id: string, input: UpdateFacilityInput): Promise<Facility> {
  return request<Facility>(`/facilities/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
