import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiClientError, apiFetch } from "../http";

function mockFetchOnce(response: {
  status: number;
  json?: unknown;
  jsonError?: boolean;
}) {
  const fn = vi.fn(async () => ({
    ok: response.status >= 200 && response.status < 300,
    status: response.status,
    json: async () => {
      if (response.jsonError) throw new Error("invalid json");
      return response.json;
    },
  }));
  // @ts-expect-error 테스트용 fetch 모킹 (Response 전체 형태 불필요)
  global.fetch = fn;
  return fn;
}

describe("apiFetch", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("`{ data }` 응답이면 data를 반환한다", async () => {
    mockFetchOnce({ status: 200, json: { data: { hello: "world" } } });
    const result = await apiFetch<{ hello: string }>("/api/x");
    expect(result).toEqual({ hello: "world" });
  });

  it("`{ error }` 응답이면 ApiClientError를 throw하고 status/code/fields를 보존한다", async () => {
    mockFetchOnce({
      status: 400,
      json: {
        error: {
          message: "입력값이 올바르지 않습니다.",
          code: "VALIDATION_ERROR",
          fields: { name: ["필수 입력입니다."] },
        },
      },
    });

    await expect(apiFetch("/api/x", { method: "POST" })).rejects.toMatchObject({
      name: "ApiClientError",
      message: "입력값이 올바르지 않습니다.",
      status: 400,
      code: "VALIDATION_ERROR",
      fields: { name: ["필수 입력입니다."] },
    });
  });

  it("JSON 파싱이 깨지면 ApiClientError를 throw한다", async () => {
    mockFetchOnce({ status: 500, jsonError: true });
    const err = await apiFetch("/api/x").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiClientError);
    expect((err as ApiClientError).status).toBe(500);
    expect((err as ApiClientError).message).toBe("응답을 파싱할 수 없습니다.");
  });
});
