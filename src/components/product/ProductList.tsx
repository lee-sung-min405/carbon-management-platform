"use client";

import Link from "next/link";
import { ArrowRight, FilePlus2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatKgCO2e, formatDateTime } from "@/lib/format";
import type { ProductListItem } from "@/types/api";

export interface ProductListProps {
  products: ProductListItem[];
  onCreate: () => void;
}

/**
 * 제품 목록 표 (Presentational).
 * - `lastRun` 은 `{ runAt, totalKgCO2e } | null`
 * - 활동이 있는 제품: "대시보드 보기" → `/products/[id]`
 * - 활동이 없는 제품: "데이터 입력" → 상세 페이지 (활동 추가는 Commit 6)
 */
export function ProductList({ products, onCreate }: ProductListProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3 text-left">제품명</th>
              <th className="px-5 py-3 text-left">SKU</th>
              <th className="px-5 py-3 text-left">기능단위</th>
              <th className="px-5 py-3 text-right">활동 수</th>
              <th className="px-5 py-3 text-left">최근 계산</th>
              <th className="px-5 py-3 text-right">총 PCF</th>
              <th className="px-5 py-3 text-right">상세 보기</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="px-5 py-3 text-slate-900">
                  {p.name || (
                    <span className="text-slate-400">(이름 없음)</span>
                  )}
                </td>
                <td className="px-5 py-3 font-mono text-slate-700">
                  {p.sku ?? "-"}
                </td>
                <td className="px-5 py-3 text-slate-700">
                  {p.functionalUnit}
                </td>
                <td className="px-5 py-3 text-right font-mono">
                  {p.activityCount}건
                </td>
                <td className="px-5 py-3 font-mono text-slate-600">
                  {p.lastRun ? formatDateTime(p.lastRun.runAt) : "-"}
                </td>
                <td className="px-5 py-3 text-right font-mono text-slate-900">
                  {p.lastRun ? formatKgCO2e(p.lastRun.totalKgCO2e) : "-"}
                </td>
                <td className="px-5 py-3 text-right">
                  {p.activityCount > 0 ? (
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/products/${p.id}`}>
                        대시보드 보기
                        <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      asChild
                      size="sm"
                      className="bg-emerald-700 hover:bg-emerald-800"
                    >
                      <Link href={`/products/${p.id}`}>
                        <FilePlus2 className="mr-1 h-3.5 w-3.5" aria-hidden />
                        데이터 입력
                      </Link>
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-3">
        <p className="text-xs text-slate-500">총 {products.length}개 제품</p>
        <Button
          size="sm"
          className="bg-emerald-700 hover:bg-emerald-800"
          onClick={onCreate}
        >
          <FilePlus2 className="mr-1 h-3.5 w-3.5" aria-hidden /> 제품 추가
        </Button>
      </div>
    </div>
  );
}
