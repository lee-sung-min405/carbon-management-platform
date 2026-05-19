"use client";

import { Suspense, useCallback, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProduct, useRuns, useFactors } from "@/lib/api/hooks";
import { runCalculation } from "@/lib/api/mutations";
import { LoadingState } from "@/components/common/LoadingState";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";
import { getErrorMessage } from "@/lib/api/error-messages";
import { formatDateTime, formatKgCO2e } from "@/lib/format";
import {
  summarizeByStage,
  summarizeByScope,
  getTopEmissionActivities,
} from "@/domain/pcf/summarize";
import {
  buildTopEmittersRows,
  buildInsights,
} from "@/lib/adapters/dashboard";
import { TotalPcfCard } from "@/components/dashboard/TotalPcfCard";
import { StagePieChart } from "@/components/dashboard/StagePieChart";
import { ScopeDonut } from "@/components/dashboard/ScopeDonut";
import { StageBarChart } from "@/components/dashboard/StageBarChart";
import { TopEmittersTable } from "@/components/dashboard/TopEmittersTable";
import { CalculationBasisNote } from "@/components/dashboard/CalculationBasisNote";
import { CalculationRunsHistory } from "@/components/dashboard/CalculationRunsHistory";
import { ActivityForm } from "@/components/activity/ActivityForm";
import { ActivitiesTable } from "@/components/activity/ActivitiesTable";
import { BulkImportPanel } from "@/components/activity/BulkImportPanel";
import type { Activity, CalculationRun, ProductDetail, RunMeta } from "@/types/api";

const TAB_VALUES = ["activities", "runs", "csv"] as const;
type TabValue = (typeof TAB_VALUES)[number];

/**
 * 제품 상세 Container.
 * - `useProduct(id)` + `useRuns(id)` 로 페치 (4상태 처리)
 * - "계산 실행" → `runCalculation` → 결과(items + snapshotJson) 를 세션 상태로 보관
 *   (백엔드에 단건 run 상세 API 가 없어 새로고침 시 사라지는 게 정상)
 * - 헤더(페이지 내부): 뒤로가기 + 제품 메타 + 우측 CTA
 * - 자식 컴포넌트(차트/활동 폼/히스토리) 연결은 다음 커밋
 */
export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? null;

  const product = useProduct(id);
  const runs = useRuns(id);
  const factors = useFactors();

  // 이번 세션에서 막 실행한 계산 결과(전체 items 포함).
  // runs 목록에는 메타만 있어 차트 그리려면 별도 보관 필요.
  const [lastRun, setLastRun] = useState<CalculationRun | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);
  // 활동 표 → 폼 편집 대상.
  const [editTarget, setEditTarget] = useState<Activity | null>(null);

  const handleCalculate = async () => {
    if (!id) return;
    setIsCalculating(true);
    setCalcError(null);
    try {
      const result = await runCalculation(id);
      setLastRun(result);
      // 메타 목록도 재검증
      void runs.mutate();
      void product.mutate();
    } catch (err) {
      setCalcError(getErrorMessage(err));
    } finally {
      setIsCalculating(false);
    }
  };

  // ── 4상태 처리 ──
  if (product.isLoading) {
    return <LoadingState variant="skeleton-card" />;
  }
  if (product.error) {
    return (
      <ErrorState error={product.error} onRetry={() => product.mutate()} />
    );
  }
  if (!product.data) {
    return (
      <EmptyState
        title="제품을 찾을 수 없습니다."
        description="목록으로 돌아가 다른 제품을 선택하세요."
      />
    );
  }

  const p = product.data;

  return (
    <div className="space-y-6">
      <DetailHeader
        product={p}
        isCalculating={isCalculating}
        onCalculate={handleCalculate}
      />

      {calcError && (
        <ErrorState
          message={calcError}
          onRetry={() => void handleCalculate()}
        />
      )}
{lastRun ? (
        <DashboardGrid
          product={p}
          run={lastRun}
          allFactors={factors.data ?? []}
        />
      ) : (
        <LatestRunSummary product={p} lastRun={lastRun} />
      )}

      <Suspense fallback={null}>
        <DetailTabs
          product={p}
          runs={runs.data ?? []}
          lastSession={lastRun}
          editTarget={editTarget}
          onEdit={setEditTarget}
          onActivityChanged={() => {
            setEditTarget(null);
            void product.mutate();
          }}
          onCalculate={handleCalculate}
          isCalculating={isCalculating}
          onCsvUploaded={() => {
            void product.mutate();
            void runs.mutate();
          }}
        />
      </Suspense>
    </div>
  );
}

function DetailTabs({
  product,
  runs,
  lastSession,
  editTarget,
  onEdit,
  onActivityChanged,
  onCalculate,
  isCalculating,
  onCsvUploaded,
}: {
  product: ProductDetail;
  runs: RunMeta[];
  lastSession: CalculationRun | null;
  editTarget: Activity | null;
  onEdit: (a: Activity | null) => void;
  onActivityChanged: () => void;
  onCalculate: () => void;
  isCalculating: boolean;
  onCsvUploaded: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const raw = searchParams.get("tab");
  const active: TabValue = (TAB_VALUES as readonly string[]).includes(raw ?? "")
    ? (raw as TabValue)
    : "activities";

  const setActive = useCallback(
    (v: string) => {
      const next = new URLSearchParams(searchParams.toString());
      if (v === "activities") next.delete("tab");
      else next.set("tab", v);
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  return (
    <Tabs value={active} onValueChange={setActive} className="space-y-5">
      <TabsList>
        <TabsTrigger value="activities">
          활동 데이터 ({product.activities.length})
        </TabsTrigger>
        <TabsTrigger value="runs">계산 이력 ({runs.length})</TabsTrigger>
        <TabsTrigger value="csv">CSV 임포트</TabsTrigger>
      </TabsList>

      <TabsContent value="activities" className="mt-0">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <ActivityForm
              productId={product.id}
              initial={editTarget}
              onSubmitted={onActivityChanged}
              onCancelEdit={() => onEdit(null)}
            />
          </div>
          <div className="lg:col-span-3">
            <ActivitiesTable
              activities={product.activities}
              onEdit={onEdit}
              onDeleted={onActivityChanged}
            />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="runs" className="mt-0">
        <CalculationRunsHistory
          runs={runs}
          lastSession={lastSession}
          onCalculate={onCalculate}
          isCalculating={isCalculating}
        />
      </TabsContent>

      <TabsContent value="csv" className="mt-0">
        <BulkImportPanel productId={product.id} onUploaded={onCsvUploaded} />
      </TabsContent>
    </Tabs>
  );
}

function DashboardGrid({
  product,
  run,
  allFactors,
}: {
  product: ProductDetail;
  run: CalculationRun;
  allFactors: import("@/types/api").Factor[];
}) {
  const stageSummary = summarizeByStage(run.items);
  const scopeSummary = summarizeByScope(run.items);
  const topItems = getTopEmissionActivities(run.items, 5);

  // 활동 join → 표 row + 인사이트
  const topRows = buildTopEmittersRows(
    topItems,
    product.activities,
    run.totalKgCO2e,
  );

  // 이 제품 계산에 실제로 사용된 계수만 노출 (전체 계수 카탈로그에서 필터)
  const usedFactorIds = new Set(
    product.activities.map((a) => a.factorId),
  );
  const usedFactors = allFactors.filter((f) => usedFactorIds.has(f.id));
  const isDemo =
    usedFactors.some((f) => f.isDemo) ||
    product.activities.some((a) => a.factor.isDemo);

  const insights = buildInsights(
    stageSummary,
    scopeSummary,
    topRows[0],
    product.activities,
    usedFactors,
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        <div className="min-w-0">
          <TotalPcfCard
            total={run.totalKgCO2e}
            functionalUnit={product.functionalUnit}
            calculatedAt={run.runAt}
            insights={insights}
          />
        </div>
        <div className="min-w-0">
          <StagePieChart data={stageSummary} />
        </div>
        <div className="min-w-0">
          <ScopeDonut data={scopeSummary} />
        </div>
      </div>

      <StageBarChart data={stageSummary} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <TopEmittersTable rows={topRows} />
        </div>
        <div className="min-w-0">
          <CalculationBasisNote factors={usedFactors} isDemo={isDemo} />
        </div>
      </div>
      {/* 차트 / 활동 폼 / 히스토리는 다음 커밋에서 추가 */}
    </div>
  );
}

function DetailHeader({
  product,
  isCalculating,
  onCalculate,
}: {
  product: ProductDetail;
  isCalculating: boolean;
  onCalculate: () => void;
}) {
  return (
    <header className="space-y-3">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> 목록
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-slate-900">
            {product.name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {product.sku && (
              <>
                <span className="font-mono">SKU {product.sku}</span>
                <span className="mx-1.5">·</span>
              </>
            )}
            기능단위 {product.functionalUnit}
            <span className="mx-1.5">·</span>
            활동 {product.activities.length}건
          </p>
        </div>

        <Button
          onClick={onCalculate}
          disabled={isCalculating || product.activities.length === 0}
          className="bg-emerald-700 hover:bg-emerald-800"
        >
          {isCalculating ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="mr-1 h-4 w-4" aria-hidden />
          )}
          계산 실행
        </Button>
      </div>
    </header>
  );
}

function LatestRunSummary({
  product,
  lastRun,
}: {
  product: ProductDetail;
  lastRun: CalculationRun | null;
}) {
  // 세션 결과가 있으면 그것을, 없으면 서버가 알려준 가장 최근 run 메타 사용.
  const sessionTotal = lastRun?.totalKgCO2e ?? null;
  const sessionAt = lastRun?.runAt ?? null;
  const lastMeta = product.runs[0];

  if (sessionTotal == null && !lastMeta) {
    return (
      <EmptyState
        title="아직 계산 결과가 없습니다."
        description={
          product.activities.length === 0
            ? "활동 데이터를 추가한 후 계산을 실행하세요."
            : "우측 상단의 ‘계산 실행’ 버튼으로 PCF 를 계산하세요."
        }
      />
    );
  }

  const total = sessionTotal ?? lastMeta!.totalKgCO2e;
  const at = sessionAt ?? lastMeta!.runAt;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6">
      <p className="text-xs uppercase tracking-wide text-slate-500">
        총 PCF (최근 계산)
      </p>
      <p className="mt-2 font-mono text-3xl text-slate-900">
        {formatKgCO2e(total)}
      </p>
      <p className="mt-2 text-xs text-slate-500">
        실행 {formatDateTime(at)} · 기능단위 {product.functionalUnit}
        {sessionTotal == null && (
          <span className="ml-2 text-amber-600">
            (서버에 저장된 메타. 차트는 ‘계산 실행’ 후 표시)
          </span>
        )}
      </p>
    </section>
  );
}
