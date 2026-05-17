import { NextResponse } from "next/server";
import { ZodError } from "zod";

/**
 * 모든 API 응답의 공통 봉투(envelope).
 * 클라이언트는 항상 `{ data }` 또는 `{ error }` 둘 중 하나만 받는다.
 */
export type ApiEnvelope<T> = { data: T } | { error: ApiError };

export interface ApiError {
  message: string;
  code?: string;
  /** Zod 검증 실패 시 필드별 메시지. */
  fields?: Record<string, string[]>;
}

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ data }, init);
}

export function fail(
  status: number,
  message: string,
  extra?: Omit<ApiError, "message">,
): NextResponse {
  return NextResponse.json({ error: { message, ...extra } }, { status });
}

export function failFromZod(err: ZodError): NextResponse {
  const fields: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    (fields[key] ??= []).push(issue.message);
  }
  return fail(400, "입력값이 올바르지 않습니다.", {
    code: "VALIDATION_ERROR",
    fields,
  });
}
