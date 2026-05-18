"use client";

import { useState } from "react";
import { useSWRConfig } from "swr";
import { useProducts } from "@/lib/api/hooks";
import { ProductList } from "@/components/product/ProductList";
import { ProductForm } from "@/components/product/ProductForm";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingState } from "@/components/common/LoadingState";
import { ErrorState } from "@/components/common/ErrorState";

/**
 * 제품 목록 Container.
 * - `useProducts()` 로 페치
 * - Loading / Error / Empty / Ready 4상태 매핑
 * - "제품 추가" → ProductForm Dialog → 성공 시 SWR revalidate
 */
export default function DashboardPage() {
  const { data, error, isLoading, mutate } = useProducts();
  const { mutate: globalMutate } = useSWRConfig();
  const [formOpen, setFormOpen] = useState(false);

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">제품 목록</h1>
          <p className="text-sm text-slate-500">
            제품을 선택해 활동 데이터 입력과 PCF 계산을 진행하세요.
          </p>
        </div>
      </header>

      {isLoading && <LoadingState variant="skeleton-table" rows={4} />}

      {!isLoading && error && (
        <ErrorState error={error} onRetry={() => mutate()} />
      )}

      {!isLoading && !error && data && data.length === 0 && (
        <EmptyState
          title="아직 등록된 제품이 없습니다."
          description="첫 제품을 추가해 PCF 측정을 시작하세요."
          actionLabel="제품 추가"
          onAction={() => setFormOpen(true)}
        />
      )}

      {!isLoading && !error && data && data.length > 0 && (
        <ProductList
          products={data}
          onCreate={() => setFormOpen(true)}
        />
      )}

      <ProductForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onCreated={() => {
          // 목록 재검증
          void globalMutate("/api/products");
        }}
      />
    </div>
  );
}
