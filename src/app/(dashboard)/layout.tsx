import { AppHeader } from "@/components/common/AppHeader";
import { DemoBanner } from "@/components/common/DemoBanner";

/**
 * (dashboard) 라우트 그룹 공통 레이아웃.
 * - 전역 헤더 + 데모 배너 + 1440 max-width 컨테이너.
 * - context 는 children 트리에서 page 별로 별도 DemoBanner 가 필요하면 덮어쓸 수 있음.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AppHeader />
      <DemoBanner context="list" />
      <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6">
        {children}
      </main>
    </div>
  );
}
