import Link from "next/link";
import { Leaf } from "lucide-react";
import { HealthBadge } from "./HealthBadge";

export interface AppHeaderProps {
  /** 우측 영역 CTA 슬롯 (예: "제품 추가" 버튼). */
  rightSlot?: React.ReactNode;
}

/**
 * 전역 헤더 — 로고 + 제품명 + Health 배지 + 우측 CTA 슬롯.
 * (dashboard) 라우트 그룹의 layout 에서 사용.
 */
export function AppHeader({ rightSlot }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-slate-900 hover:text-emerald-700"
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-emerald-700 text-white">
            <Leaf className="h-4 w-4" aria-hidden />
          </span>
          <span className="font-semibold">Carbon Management</span>
        </Link>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <HealthBadge />
          {rightSlot}
        </div>
      </div>
    </header>
  );
}
