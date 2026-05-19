"use client";

import { useEffect, useMemo } from "react";
import { Calculator } from "lucide-react";
import type { Control, UseFormRegister, UseFormSetValue } from "react-hook-form";
import { Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatNumber } from "@/lib/format";
import type { ActivityFormValues, TransportMode } from "./ActivityForm";

export interface TransportFieldsProps {
  control: Control<ActivityFormValues>;
  register: UseFormRegister<ActivityFormValues>;
  setValue: UseFormSetValue<ActivityFormValues>;
  mode: TransportMode;
  onModeChange: (m: TransportMode) => void;
  weightKg: number | undefined;
  distanceKm: number | undefined;
  errors: {
    amount?: string;
    weightKg?: string;
    distanceKm?: string;
  };
}

/**
 * TRANSPORT 단계 전용 입력 필드.
 * - 파생 모드: 무게(kg) + 거리(km) → ton-km 자동 환산 (라이브 미리보기)
 * - 직접 모드: ton-km 활동량 직접 입력
 * - 모드 전환 시 반대편 값 초기화.
 */
export function TransportFields({
  control,
  register,
  setValue,
  mode,
  onModeChange,
  weightKg,
  distanceKm,
  errors,
}: TransportFieldsProps) {
  const derivedTonKm = useMemo(() => {
    if (mode !== "derived") return null;
    const w = Number(weightKg);
    const d = Number(distanceKm);
    if (!w || !d || Number.isNaN(w) || Number.isNaN(d)) return null;
    return (w / 1000) * d;
  }, [mode, weightKg, distanceKm]);

  // 모드 전환 시 반대 모드 값 비우기 (검증 충돌 방지).
  useEffect(() => {
    if (mode === "derived") {
      setValue("amount", 0, { shouldValidate: false });
    } else {
      setValue("weightKg", undefined, { shouldValidate: false });
      setValue("distanceKm", undefined, { shouldValidate: false });
    }
  }, [mode, setValue]);

  return (
    <>
      <div className="md:col-span-2">
        <Label>운송 입력 방식</Label>
        <Controller
          control={control}
          name="amount"
          render={() => (
            <RadioGroup
              value={mode}
              onValueChange={(v) => onModeChange(v as TransportMode)}
              className="mt-2 flex flex-wrap gap-6"
            >
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <RadioGroupItem value="derived" /> 파생 계산: 무게 × 거리
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <RadioGroupItem value="direct" /> 직접 입력: ton-km
              </label>
            </RadioGroup>
          )}
        />
      </div>

      {mode === "derived" ? (
        <>
          <div>
            <Label htmlFor="weightKg">중량 (kg)</Label>
            <Input
              id="weightKg"
              className="mt-1.5"
              type="number"
              step="0.001"
              min="0"
              aria-describedby={errors.weightKg ? "err-weightKg" : undefined}
              aria-invalid={!!errors.weightKg}
              {...register("weightKg", { valueAsNumber: true })}
            />
            {errors.weightKg && (
              <p id="err-weightKg" className="mt-1 text-xs text-red-600">
                {errors.weightKg}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="distanceKm">거리 (km)</Label>
            <Input
              id="distanceKm"
              className="mt-1.5"
              type="number"
              step="0.001"
              min="0"
              aria-describedby={
                errors.distanceKm ? "err-distanceKm" : undefined
              }
              aria-invalid={!!errors.distanceKm}
              {...register("distanceKm", { valueAsNumber: true })}
            />
            {errors.distanceKm && (
              <p id="err-distanceKm" className="mt-1 text-xs text-red-600">
                {errors.distanceKm}
              </p>
            )}
          </div>
          <div className="md:col-span-2 rounded-md border border-emerald-100 bg-emerald-50 p-3">
            <p className="flex items-center gap-1.5 text-xs text-emerald-800">
              <Calculator className="h-3.5 w-3.5" aria-hidden />
              계산된 활동량:{" "}
              <span className="font-mono">
                {derivedTonKm != null ? formatNumber(derivedTonKm) : "—"} ton-km
              </span>
            </p>
            <p className="mt-1 font-mono text-[11px] text-emerald-700">
              계산식: (중량 kg / 1000) × 거리 km
            </p>
          </div>
        </>
      ) : (
        <div className="md:col-span-2">
          <Label htmlFor="amount-direct">활동량 (ton-km)</Label>
          <Input
            id="amount-direct"
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
              {errors.amount}
            </p>
          )}
        </div>
      )}
    </>
  );
}
