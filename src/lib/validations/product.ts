import { z } from "zod";

/**
 * Product 생성 입력 Zod 스키마.
 * API(`POST /api/products`)와 폼(`ProductForm`)에서 공통 재사용한다.
 *
 * - 빈 문자열은 선택 필드에서 `undefined`로 정규화한다 (DB에 빈 문자열 저장 방지).
 * - `name`/`functionalUnit`은 trim 후 1자 이상.
 */
export const ProductCreateInput = z.object({
  name: z.string().trim().min(1, "제품명을 입력해주세요."),
  sku: z
    .union([z.string().trim().min(1), z.literal("")])
    .optional()
    .transform((v) => (v === "" || v == null ? undefined : v)),
  functionalUnit: z
    .string()
    .trim()
    .min(1, "기능단위(예: 1 unit, 1 kg)를 입력해주세요."),
  description: z
    .union([z.string().trim(), z.literal("")])
    .optional()
    .transform((v) => (v === "" || v == null ? undefined : v)),
});

export type ProductCreateInput = z.infer<typeof ProductCreateInput>;
