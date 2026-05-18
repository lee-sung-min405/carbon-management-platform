import { z } from "zod";

import { STAGE_CODES } from "@/domain/pcf/stages";

/**
 * ProductActivity 입력 Zod 스키마.
 * - amount: 음수 금지.
 *   · 비-운송 단계 → 0 초과 필수.
 *   · TRANSPORT 단계 → 두 입력 모드 중 하나 선택(아래).
 * - TRANSPORT 입력 모드 (XOR-ish):
 *   ① 파생 모드: weightKg + distanceKm 모두 입력 → 계산기가 ton-km로 환산.
 *   ② 직접 모드: amount > 0 (단위: ton-km) → weightKg/distanceKm 비움.
 *   둘 중 어느 쪽도 만족하지 못하면 검증 실패. 한쪽만 채운 입력(weightKg만 등)도 실패.
 * - 그 외 단계: weightKg/distanceKm 입력되어도 API 레이어에서 null로 강제.
 * - allocationRatio: 0 초과 1 이하 (기본 1)
 * - 빈 문자열 note → undefined로 정규화
 */
export const ActivityInput = z
  .object({
    stageCode: z.enum(STAGE_CODES, {
      message: "유효한 단계 코드가 아닙니다.",
    }),
    name: z.string().trim().min(1, "활동명을 입력해주세요."),
    amount: z
      .number()
      .nonnegative("활동량은 0 이상이어야 합니다."),
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
    occurredOn: z
      .union([z.coerce.date(), z.null()])
      .optional()
      .transform((v) => (v == null ? undefined : v)),
    note: z
      .union([z.string().trim(), z.literal("")])
      .optional()
      .transform((v) => (v === "" || v == null ? undefined : v)),
  })
  .superRefine((v, ctx) => {
    if (v.stageCode === "TRANSPORT") {
      const hasWeight = v.weightKg != null;
      const hasDistance = v.distanceKm != null;
      const hasDerived = hasWeight && hasDistance;
      const hasDirect = v.amount > 0;

      // 한쪽만 채운 파생 입력(무게만 or 거리만) — 항상 실패
      if (hasWeight !== hasDistance) {
        ctx.addIssue({
          path: [hasWeight ? "distanceKm" : "weightKg"],
          code: "custom",
          message: "운송 단계에서 무게(kg)와 거리(km)는 함께 입력해야 합니다.",
        });
        return;
      }

      // 둘 다 비었고 amount(ton-km)도 없음
      if (!hasDerived && !hasDirect) {
        ctx.addIssue({
          path: ["amount"],
          code: "custom",
          message:
            "운송 단계는 무게(kg)+거리(km)를 모두 입력하거나, 활동량(ton-km)을 0보다 크게 입력해야 합니다.",
        });
      }
      return;
    }

    // 비-운송 단계: amount가 곧 활동량이므로 0보다 커야 함
    if (!(v.amount > 0)) {
      ctx.addIssue({
        path: ["amount"],
        code: "custom",
        message: "활동량은 0보다 커야 합니다.",
      });
    }
  });

export type ActivityInput = z.infer<typeof ActivityInput>;

/**
 * 활동 일괄 입력 Zod 스키마 (R17 bulk import).
 *
 * - `items`: 1~500건 제한 (과제 자료 30행 + 여유).
 * - `mode`:
 *   · `"append"` (기본): 기존 활동을 유지하고 새 항목만 추가.
 *   · `"replace"`: 트랜잭션 안에서 해당 제품의 기존 활동을 모두 삭제한 뒤 새로 삽입.
 *     멱등 임포트(같은 CSV를 두 번 올려도 결과 동일) 시연용.
 *
 * CSV 업로드 경로(`text/csv`)는 본 스키마를 거치지 않고 별도 파서를 사용한다.
 */
export const ActivityBulkInput = z.object({
  items: z
    .array(ActivityInput)
    .min(1, "최소 1건 이상의 활동을 입력해주세요.")
    .max(500, "한 번에 임포트할 수 있는 활동은 최대 500건입니다."),
  mode: z.enum(["append", "replace"]).default("append"),
});

export type ActivityBulkInput = z.infer<typeof ActivityBulkInput>;
