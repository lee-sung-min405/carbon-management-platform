import type { NextResponse } from "next/server";

import { Prisma } from "@/generated/prisma/client";
import type { StageCode } from "@/domain/pcf/stages";
import { prisma } from "@/lib/db";
import { fail } from "@/lib/api/response";
import { API_ERROR_CODES, type ApiErrorCode } from "@/lib/api/error-codes";
import type { ActivityInput } from "@/lib/validations/activity";

/**
 * API 라우트 공통 헬퍼.
 *
 * 모든 헬퍼는 `{ ok: true; ... } | { ok: false; response }` 형태의 discriminated union을
 * 반환하여 호출부에서 `if (!r.ok) return r.response;` 로 가드 처리할 수 있게 한다.
 *
 * 응답 봉투/에러 코드/메시지 문구는 기존 라우트와 1:1 동일하게 유지한다 (UI 호환).
 */

type HandlerResult<T> =
  | ({ ok: true } & T)
  | { ok: false; response: NextResponse };

/** 요청 본문(JSON) 파싱. 실패 시 400. */
export async function parseJsonBody(
  request: Request,
): Promise<HandlerResult<{ body: unknown }>> {
  try {
    const body = await request.json();
    return { ok: true, body };
  } catch {
    return {
      ok: false,
      response: fail(400, "요청 본문(JSON)을 파싱할 수 없습니다.", {
        code: API_ERROR_CODES.INVALID_JSON,
      }),
    };
  }
}

/** 제품 존재 보장. 없으면 404. */
export async function requireProduct(
  productId: string,
): Promise<HandlerResult<{ product: { id: string } }>> {
  if (!productId) {
    return {
      ok: false,
      response: fail(400, "제품 ID가 필요합니다.", {
        code: API_ERROR_CODES.INVALID_PRODUCT_ID,
      }),
    };
  }
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!product) {
    return {
      ok: false,
      response: fail(404, "해당 제품을 찾을 수 없습니다.", {
        code: API_ERROR_CODES.PRODUCT_NOT_FOUND,
      }),
    };
  }
  return { ok: true, product };
}

/** 배출계수 존재 + 단계 일치 보장. */
export async function validateFactorForStage(
  factorId: string,
  stageCode: StageCode,
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const factor = await prisma.emissionFactor.findUnique({
    where: { id: factorId },
    select: { id: true, stageCode: true },
  });
  if (!factor) {
    return {
      ok: false,
      response: fail(400, "선택한 배출계수를 찾을 수 없습니다.", {
        code: API_ERROR_CODES.FACTOR_NOT_FOUND,
        fields: { factorId: ["배출계수가 존재하지 않습니다."] },
      }),
    };
  }
  if (factor.stageCode !== stageCode) {
    return {
      ok: false,
      response: fail(
        400,
        "배출계수의 단계가 활동 단계와 일치하지 않습니다.",
        {
          code: API_ERROR_CODES.FACTOR_STAGE_MISMATCH,
          fields: {
            factorId: [`선택한 계수는 ${factor.stageCode} 단계용입니다.`],
          },
        },
      ),
    };
  }
  return { ok: true };
}

/**
 * Prisma 예외 → 표준 API 응답.
 * - P2025 (Record not found) → 404 + `notFoundCode`
 * - 그 외 → 500 + `INTERNAL_ERROR` (콘솔에 로그)
 */
export function handlePrismaError(
  err: unknown,
  fallbackMessage: string,
  notFoundOpts: {
    message?: string;
    code?: ApiErrorCode;
  } = {},
): NextResponse {
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2025"
  ) {
    return fail(
      404,
      notFoundOpts.message ?? "해당 리소스를 찾을 수 없습니다.",
      notFoundOpts.code ? { code: notFoundOpts.code } : undefined,
    );
  }
  console.error(`[handlePrismaError] ${fallbackMessage}`, err);
  return fail(500, fallbackMessage, { code: API_ERROR_CODES.INTERNAL_ERROR });
}

/**
 * `ActivityInput` → Prisma create/update payload (productId 제외).
 * TRANSPORT 가 아닌 단계에서는 weightKg/distanceKm 를 null 로 강제한다.
 */
export function toActivityWriteData(input: ActivityInput) {
  const isTransport = input.stageCode === "TRANSPORT";
  return {
    stageCode: input.stageCode,
    name: input.name,
    amount: input.amount,
    unit: input.unit,
    factorId: input.factorId,
    allocationRatio: input.allocationRatio,
    weightKg: isTransport ? input.weightKg ?? null : null,
    distanceKm: isTransport ? input.distanceKm ?? null : null,
    note: input.note ?? null,
  };
}
