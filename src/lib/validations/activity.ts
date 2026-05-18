import { z } from "zod";

import { LIFECYCLE_STAGES } from "@/domain/pcf/stages";

const STAGE_CODES = LIFECYCLE_STAGES.map((s) => s.code) as [
  "RAW_MATERIAL",
  "PRODUCTION",
  "TRANSPORT",
  "USE",
  "END_OF_LIFE",
];

/**
 * ProductActivity 입력 Zod 스키마.
 * - 음수/0 차단: amount/weightKg/distanceKm 모두 `positive()`
 * - allocationRatio: 0 초과 1 이하 (기본 1)
 * - TRANSPORT 단계: weightKg/distanceKm 필수 (superRefine)
 * - 그 외 단계: weightKg/distanceKm 입력되어도 무시 (운송 외 사용 방지)
 * - 빈 문자열 note → undefined로 정규화
 */
export const ActivityInput = z
  .object({
    stageCode: z.enum(STAGE_CODES, {
      message: "유효한 단계 코드가 아닙니다.",
    }),
    name: z.string().trim().min(1, "활동명을 입력해주세요."),
    amount: z.number().positive("활동량은 0보다 커야 합니다."),
    unit: z.string().trim().min(1, "단위를 입력해주세요."),
    factorId: z.string().trim().min(1, "배출계수를 선택해주세요."),
    allocationRatio: z
      .number()
      .gt(0, "할당비율은 0보다 커야 합니다.")
      .lte(1, "할당비율은 1 이하여야 합니다.")
      .default(1),
    weightKg: z
      .number()
      .positive("무게(kg)는 0보다 커야 합니다.")
      .optional(),
    distanceKm: z
      .number()
      .positive("거리(km)는 0보다 커야 합니다.")
      .optional(),
    note: z
      .union([z.string().trim(), z.literal("")])
      .optional()
      .transform((v) => (v === "" || v == null ? undefined : v)),
  })
  .superRefine((v, ctx) => {
    if (v.stageCode === "TRANSPORT") {
      if (v.weightKg == null) {
        ctx.addIssue({
          path: ["weightKg"],
          code: "custom",
          message: "운송 단계에서는 무게(kg)를 입력해야 합니다.",
        });
      }
      if (v.distanceKm == null) {
        ctx.addIssue({
          path: ["distanceKm"],
          code: "custom",
          message: "운송 단계에서는 거리(km)를 입력해야 합니다.",
        });
      }
    }
  });

export type ActivityInput = z.infer<typeof ActivityInput>;
