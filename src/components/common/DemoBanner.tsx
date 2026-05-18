import { AlertTriangle } from "lucide-react";

export interface DemoBannerProps {
  context?: "list" | "detail";
}

/**
 * 데모용 배출계수임을 사용자에게 명시하는 노란 배너.
 * 인증/보고 용도 사용 금지 안내. context 별 문구 다름.
 */
export function DemoBanner({ context = "list" }: DemoBannerProps) {
  const msg =
    context === "detail"
      ? "DEMO ONLY · 본 결과는 데모 배출계수 기반이며 인증/보고 용도로 사용할 수 없습니다."
      : "DEMO ONLY · 본 화면의 배출계수는 과제 시연용 샘플 데이터이며, 인증/보고 용도로 사용할 수 없습니다.";
  return (
    <div
      role="note"
      className="flex items-start gap-3 border-y border-amber-200 bg-amber-50 px-4 py-2.5 text-amber-900 sm:px-6"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p className="text-sm">{msg}</p>
    </div>
  );
}
