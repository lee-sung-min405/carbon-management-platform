/**
 * 클라이언트(및 서버 컴포넌트) 공용 fetch 헬퍼.
 *
 * 모든 API 응답은 `{ data } | { error }` 봉투 형태이므로(`@/lib/api/response`
 * 참고) 호출부마다 동일한 풀이 로직을 반복하지 않도록 한 곳에서 처리한다.
 * 실패 시 상태/코드/필드를 보존한 `ApiClientError`를 throw 한다.
 */

import type { ApiError } from "./api/response";

export class ApiClientError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly fields?: Record<string, string[]>;

  constructor(status: number, apiError: ApiError) {
    super(apiError.message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = apiError.code;
    this.fields = apiError.fields;
  }
}

/**
 * 봉투 응답을 풀어 `data`를 반환. 실패 시 `ApiClientError`를 throw.
 * 서버 컴포넌트에서도 사용 가능하도록 DOM/React 의존을 두지 않는다.
 */
export async function apiFetch<T>(
  input: string | URL,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new ApiClientError(res.status, {
      message: "응답을 파싱할 수 없습니다.",
    });
  }

  const errorField = (body as { error?: ApiError } | null)?.error;
  if (!res.ok || errorField) {
    throw new ApiClientError(
      res.status,
      errorField ?? { message: `HTTP ${res.status}` },
    );
  }
  return (body as { data: T }).data;
}

// 메서드별 편의 단축
export const apiGet = <T>(url: string, init?: RequestInit) =>
  apiFetch<T>(url, init);
export const apiPost = <T>(url: string, body: unknown, init?: RequestInit) =>
  apiFetch<T>(url, { ...init, method: "POST", body: JSON.stringify(body) });
export const apiPut = <T>(url: string, body: unknown, init?: RequestInit) =>
  apiFetch<T>(url, { ...init, method: "PUT", body: JSON.stringify(body) });
export const apiDelete = <T>(url: string, init?: RequestInit) =>
  apiFetch<T>(url, { ...init, method: "DELETE" });
