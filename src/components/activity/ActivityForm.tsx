"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, RotateCw } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiClientError } from "@/lib/http";
import { API_ERROR_CODES } from "@/lib/api/error-codes";
import { getErrorMessage } from "@/lib/api/error-messages";
import { useFactors } from "@/lib/api/hooks";
import { createActivity, updateActivity } from "@/lib/api/mutations";
import { ActivityInput } from "@/lib/validations/activity";
import { LIFECYCLE_STAGES, type StageCode } from "@/domain/pcf/stages";
import { formatNumber } from "@/lib/format";
import type { Activity } from "@/types/api";
import { TransportFields } from "./TransportFields";

export type ActivityFormValues = z.input<typeof ActivityInput>;
type ActivityFormOutput = z.output<typeof ActivityInput>;

export type TransportMode = "derived" | "direct";

const DEFAULTS: ActivityFormValues = {
  stageCode: "RAW_MATERIAL",
  factorId: "",
  name: "",
  amount: 0,
  unit: "",
  allocationRatio: 1,
  weightKg: undefined,
  distanceKm: undefined,
  occurredOn: null,
  note: "",
};

export interface ActivityFormProps {
  productId: string;
  /** 수정 모드일 때 채워 넣을 기존 활동. null/undefined → 신규. */
  initial?: Activity | null;
  /** 성공 시 호출. 부모가 mutate 트리거 + edit 상태 해제. */
  onSubmitted?: () => void;
  /** 수정 취소 시 호출. */
  onCancelEdit?: () => void;
}

/**
 * 활동 입력/수정 폼.
 * - RHF + zodResolver(ActivityInput) — superRefine 으로 단계별 검증.
 * - 단계 변경 시 factorId/unit 리셋 + 단계 필터 적용된 factor 목록 갱신.
 * - TRANSPORT 단계는 파생/직접 모드 분기를 별도 컴포넌트로 위임.
 * - 서버 에러: SKU_CONFLICT 형식의 fields 매핑 + FACTOR_STAGE_MISMATCH → factorId 인라인.
 */
export function ActivityForm({
  productId,
  initial,
  onSubmitted,
  onCancelEdit,
}: ActivityFormProps) {
  const isEdit = !!initial;
  const [transportMode, setTransportMode] = useState<TransportMode>("derived");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<ActivityFormValues, unknown, ActivityFormOutput>({
    resolver: zodResolver(ActivityInput),
    defaultValues: DEFAULTS,
    mode: "onSubmit",
  });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
    setError,
    reset,
    control,
  } = form;

  const stage = watch("stageCode") as StageCode;
  const factorId = watch("factorId");
  const weightKg = watch("weightKg") as number | undefined;
  const distanceKm = watch("distanceKm") as number | undefined;
  const isTransport = stage === "TRANSPORT";

  // 단계별 계수 목록 (서버 필터).
  const factorsQuery = useFactors({ stage });
  const factors = factorsQuery.data ?? [];
  const selectedFactor = factors.find((f) => f.id === factorId);

  // 단계 변경 시 factor/unit 리셋 (편집 모드에서 같은 단계로 유지될 땐 보존).
  useEffect(() => {
    if (!selectedFactor || selectedFactor.stageCode !== stage) {
      if (factorId) {
        setValue("factorId", "", { shouldValidate: false });
        setValue("unit", "", { shouldValidate: false });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  // factor 선택 시 unit 자동 — "kgCO2e/kg" → "kg".
  useEffect(() => {
    if (selectedFactor) {
      const unit = selectedFactor.unit.split("/")[1] ?? "";
      setValue("unit", unit, { shouldValidate: false });
    }
  }, [selectedFactor, setValue]);

  // 편집 모드: initial 로 값 채우기 + transportMode 자동 판정.
  useEffect(() => {
    if (initial) {
      reset({
        stageCode: initial.stageCode,
        factorId: initial.factorId,
        name: initial.name,
        amount: initial.amount,
        unit: initial.unit,
        allocationRatio: initial.allocationRatio,
        weightKg: initial.weightKg ?? undefined,
        distanceKm: initial.distanceKm ?? undefined,
        occurredOn: initial.occurredOn
          ? (initial.occurredOn.slice(0, 10) as unknown as Date)
          : null,
        note: initial.note ?? "",
      });
      if (initial.stageCode === "TRANSPORT") {
        setTransportMode(
          initial.weightKg != null && initial.distanceKm != null
            ? "derived"
            : "direct",
        );
      }
    }
  }, [initial, reset]);

  const onSubmit = async (values: ActivityFormOutput) => {
    setSubmitError(null);
    try {
      if (isEdit && initial) {
        await updateActivity(initial.id, values);
      } else {
        await createActivity(productId, values);
      }
      reset(DEFAULTS);
      setTransportMode("derived");
      onSubmitted?.();
    } catch (err) {
      if (err instanceof ApiClientError) {
        // 필드 단위 매핑.
        if (err.fields) {
          for (const [k, msg] of Object.entries(err.fields)) {
            if (FIELD_KEYS.includes(k as FieldKey)) {
              const text = Array.isArray(msg) ? msg.join(" ") : String(msg);
              setError(k as FieldKey, { message: text });
            }
          }
        }
        if (err.code === API_ERROR_CODES.FACTOR_STAGE_MISMATCH) {
          setError("factorId", {
            message: "선택한 배출계수의 단계가 활동 단계와 일치하지 않습니다.",
          });
        }
      }
      setSubmitError(getErrorMessage(err));
    }
  };

  const handleReset = () => {
    reset(DEFAULTS);
    setTransportMode("derived");
    setSubmitError(null);
    if (isEdit) onCancelEdit?.();
  };

  // factor 옵션 라벨용 미리 보기.
  const factorPreview = useMemo(
    () =>
      selectedFactor
        ? `${formatNumber(selectedFactor.value, 6)} ${selectedFactor.unit}`
        : "",
    [selectedFactor],
  );

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex h-full flex-col rounded-lg border border-slate-200 bg-white"
      noValidate
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 p-5">
        <div>
          <p className="text-sm text-slate-700">
            {isEdit ? "활동 수정" : "활동 데이터 입력"}
          </p>
          {isEdit && (
            <p className="mt-0.5 text-xs text-slate-500">
              ID {initial!.id.slice(0, 8)} 편집 중
            </p>
          )}
        </div>
        {isEdit && (
          <Button type="button" variant="outline" onClick={handleReset}>
            편집 취소
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
        {/* 1. 단계 */}
        <div>
          <Label htmlFor="stageCode">생애주기 단계</Label>
          <Select
            value={stage}
            onValueChange={(v) => {
              setValue("stageCode", v as StageCode, { shouldValidate: false });
              if (v !== "TRANSPORT") setTransportMode("derived");
            }}
          >
            <SelectTrigger id="stageCode" className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LIFECYCLE_STAGES.map((s) => (
                <SelectItem key={s.code} value={s.code}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 2. 배출계수 */}
        <div>
          <Label htmlFor="factorId">배출계수</Label>
          <Select
            value={factorId || ""}
            onValueChange={(v) =>
              setValue("factorId", v, { shouldValidate: true })
            }
            disabled={factors.length === 0}
          >
            <SelectTrigger
              id="factorId"
              className="mt-1.5"
              aria-describedby={errors.factorId ? "err-factorId" : undefined}
              aria-invalid={!!errors.factorId}
            >
              <SelectValue
                placeholder={
                  factorsQuery.isLoading
                    ? "불러오는 중…"
                    : factors.length === 0
                      ? "이 단계의 계수가 없습니다"
                      : "단계에 맞는 계수 선택"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {factors.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name} · {formatNumber(f.value, 6)} {f.unit}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {factorPreview && (
            <p className="mt-1 font-mono text-[11px] text-slate-500">
              선택: {factorPreview}
            </p>
          )}
          {errors.factorId && (
            <p id="err-factorId" className="mt-1 text-xs text-red-600">
              {errors.factorId.message}
            </p>
          )}
        </div>

        {/* 3. 활동명 */}
        <div className="md:col-span-2">
          <Label htmlFor="name">활동명</Label>
          <Input
            id="name"
            className="mt-1.5"
            placeholder="예: 원소재 · 플라스틱 1"
            aria-describedby={errors.name ? "err-name" : undefined}
            aria-invalid={!!errors.name}
            {...register("name")}
          />
          {errors.name && (
            <p id="err-name" className="mt-1 text-xs text-red-600">
              {errors.name.message}
            </p>
          )}
        </div>

        {/* 4. 운송 분기 or 일반 활동량 */}
        {isTransport ? (
          <TransportFields
            control={control}
            register={register}
            setValue={setValue}
            mode={transportMode}
            onModeChange={setTransportMode}
            weightKg={weightKg}
            distanceKm={distanceKm}
            errors={{
              amount: errors.amount?.message,
              weightKg: errors.weightKg?.message,
              distanceKm: errors.distanceKm?.message,
            }}
          />
        ) : (
          <div>
            <Label htmlFor="amount">활동량</Label>
            <Input
              id="amount"
              className="mt-1.5"
              type="number"
              step="0.001"
              min="0"
              aria-describedby={errors.amount ? "err-amount" : undefined}
              aria-invalid={!!errors.amount}
              {...register("amount", { valueAsNumber: true })}
            />
            {errors.amount && (
              <p id="err-amount" className="mt-1 text-xs text-red-600">
                {errors.amount.message}
              </p>
            )}
          </div>
        )}

        {/* 5. 단위 (readonly) */}
        <div>
          <Label htmlFor="unit">단위</Label>
          <Input
            id="unit"
            className="mt-1.5 bg-slate-50"
            readOnly
            placeholder="배출계수 선택 시 자동"
            {...register("unit")}
          />
          <p className="mt-1 text-xs text-slate-500">
            선택한 배출계수에 따라 자동 결정됩니다.
          </p>
        </div>

        {/* 6. 할당비율 */}
        <div>
          <Label htmlFor="allocationRatio">할당비율 (0~1)</Label>
          <Input
            id="allocationRatio"
            className="mt-1.5"
            type="number"
            step="0.1"
            min="0"
            max="1"
            aria-describedby={
              errors.allocationRatio ? "err-allocationRatio" : undefined
            }
            aria-invalid={!!errors.allocationRatio}
            {...register("allocationRatio", { valueAsNumber: true })}
          />
          {errors.allocationRatio && (
            <p id="err-allocationRatio" className="mt-1 text-xs text-red-600">
              {errors.allocationRatio.message}
            </p>
          )}
        </div>

        {/* 7. 발생일 */}
        <div>
          <Label htmlFor="occurredOn">발생일</Label>
          <Input
            id="occurredOn"
            className="mt-1.5"
            type="date"
            {...register("occurredOn" as const)}
          />
        </div>

        {/* 8. 메모 */}
        <div className="md:col-span-2">
          <Label htmlFor="note">메모</Label>
          <Textarea
            id="note"
            className="mt-1.5"
            rows={2}
            placeholder="(선택)"
            {...register("note")}
          />
        </div>
      </div>

      {submitError && (
        <p className="px-5 pb-2 text-xs text-red-600" role="alert">
          {submitError}
        </p>
      )}

      <div className="sticky bottom-0 mt-auto flex items-center justify-end gap-2 rounded-b-lg border-t border-slate-200 bg-white/95 p-4 backdrop-blur">
        <Button
          type="button"
          variant="outline"
          onClick={handleReset}
          disabled={isSubmitting}
        >
          <RotateCw className="mr-1 h-4 w-4" aria-hidden />
          초기화
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-emerald-700 hover:bg-emerald-800"
        >
          {isSubmitting && (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden />
          )}
          {isEdit ? "변경 저장" : "활동 추가"}
        </Button>
      </div>
    </form>
  );
}

const FIELD_KEYS = [
  "stageCode",
  "factorId",
  "name",
  "amount",
  "unit",
  "allocationRatio",
  "weightKg",
  "distanceKm",
  "occurredOn",
  "note",
] as const;
type FieldKey = (typeof FIELD_KEYS)[number];
