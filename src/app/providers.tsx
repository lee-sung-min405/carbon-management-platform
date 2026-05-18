"use client";

import { SWRConfig } from "swr";
import { apiFetch } from "@/lib/http";

/**
 * SWR 기본 fetcher.
 * - 키가 문자열: 그대로 GET
 * - 키가 `[url, params]` 튜플: params 를 query string 으로 직렬화 후 GET
 *   (null/undefined 값은 무시; 그 외는 String() 변환)
 *
 * 모든 응답은 `apiFetch` 가 봉투를 까서 data 만 반환한다.
 * 실패 시 throw 되는 `ApiClientError` 는 SWR `error` 로 노출된다.
 */
async function swrFetcher<T>(
  key: string | readonly [string, Record<string, unknown> | undefined],
): Promise<T> {
  if (typeof key === "string") return apiFetch<T>(key);

  const [url, params] = key;
  if (!params) return apiFetch<T>(url);

  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v == null) continue;
    search.set(k, String(v));
  }
  const qs = search.toString();
  return apiFetch<T>(qs ? `${url}?${qs}` : url);
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher: swrFetcher,
        revalidateOnFocus: false,
        shouldRetryOnError: false,
      }}
    >
      {children}
    </SWRConfig>
  );
}
