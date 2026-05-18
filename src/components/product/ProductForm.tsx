"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { ProductCreateInput } from "@/lib/validations/product";
import { ApiClientError } from "@/lib/http";
import { API_ERROR_CODES } from "@/lib/api/error-codes";
import { getErrorMessage } from "@/lib/api/error-messages";
import { createProduct } from "@/lib/api/mutations";
import type { ProductDetail } from "@/types/api";
import type { z } from "zod";

export interface ProductFormProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (product: ProductDetail) => void;
}

// zod transform 전 input 타입 (RHF 폼 상태)
type FormValues = z.input<typeof ProductCreateInput>;
type FormOutput = z.output<typeof ProductCreateInput>;

const DEFAULTS = {
  name: "",
  sku: "",
  functionalUnit: "1 unit",
  description: "",
} as const satisfies FormValues;

const FIELD_KEYS = ["name", "sku", "functionalUnit", "description"] as const;

/**
 * 제품 생성 다이얼로그.
 * - RHF + zodResolver(ProductCreateInput) 로 클라이언트 검증
 * - 서버 SKU_CONFLICT → `sku` 인라인 에러
 * - 서버 VALIDATION_ERROR.fields → 해당 필드 인라인 에러
 */
export function ProductForm({ open, onOpenChange, onCreated }: ProductFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues, unknown, FormOutput>({
    resolver: zodResolver(ProductCreateInput),
    defaultValues: DEFAULTS,
    mode: "onSubmit",
  });

  const [topError, setTopError] = useState<string | null>(null);

  // dialog 닫힐 때 폼 초기화
  useEffect(() => {
    if (!open) {
      reset(DEFAULTS);
      setTopError(null);
    }
  }, [open, reset]);

  const onSubmit = handleSubmit(async (values) => {
    setTopError(null);
    try {
      const product = await createProduct(values);
      onCreated(product);
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.code === API_ERROR_CODES.SKU_CONFLICT) {
          setError("sku", {
            type: "server",
            message: "이미 사용 중인 SKU입니다.",
          });
          return;
        }
        if (err.code === API_ERROR_CODES.VALIDATION_ERROR && err.fields) {
          for (const [field, messages] of Object.entries(err.fields)) {
            const key = FIELD_KEYS.find((k) => k === field);
            if (key && messages.length > 0) {
              setError(key, { type: "server", message: messages[0] });
            }
          }
          return;
        }
      }
      setTopError(getErrorMessage(err));
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>제품 추가</DialogTitle>
          <DialogDescription>
            새 제품의 기본 정보를 입력하세요. SKU는 중복될 수 없습니다.
          </DialogDescription>
        </DialogHeader>

        <form id="product-form" onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="product-name">제품명</Label>
            <Input
              id="product-name"
              className="mt-1.5"
              placeholder="예: 컴퓨터 화면"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="product-sku">SKU</Label>
            <Input
              id="product-sku"
              className="mt-1.5 font-mono"
              placeholder="예: CT-046"
              aria-invalid={!!errors.sku}
              {...register("sku")}
            />
            {errors.sku && (
              <p className="mt-1 text-xs text-red-600">{errors.sku.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="product-unit">기능단위</Label>
            <Input
              id="product-unit"
              className="mt-1.5"
              placeholder="예: 1 unit"
              aria-invalid={!!errors.functionalUnit}
              {...register("functionalUnit")}
            />
            {errors.functionalUnit && (
              <p className="mt-1 text-xs text-red-600">
                {errors.functionalUnit.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="product-desc">설명</Label>
            <Textarea
              id="product-desc"
              className="mt-1.5"
              rows={3}
              placeholder="제품 설명을 입력하세요."
              {...register("description")}
            />
          </div>

          {topError && (
            <p role="alert" className="text-sm text-red-600">
              {topError}
            </p>
          )}
        </form>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            취소
          </Button>
          <Button
            type="submit"
            form="product-form"
            className="bg-emerald-700 hover:bg-emerald-800"
            disabled={isSubmitting}
          >
            {isSubmitting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            )}
            제품 생성
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
