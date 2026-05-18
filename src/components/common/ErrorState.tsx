"use client";

import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiClientError } from "@/lib/http";
import { getErrorMessage } from "@/lib/api/error-messages";

export interface ErrorStateProps {
  /** ApiClientError, Error 또는 임의의 throw 값. message/code 자동 추출. */
  error?: unknown;
  /** error 가 없을 때 직접 메시지를 넘기는 경우. */
  message?: string;
  /** error 가 없을 때 코드를 직접 넘기는 경우. */
  code?: string;
  onRetry?: () => void;
}

/**
 * 코드 우선 → 서버 메시지 → 한국어 fallback 순으로 노출.
 * 매핑은 `src/lib/api/error-messages.ts` 의 `getErrorMessage` 가 담당.
 */
export function ErrorState({
  error,
  message,
  code,
  onRetry,
}: ErrorStateProps) {
  const resolvedCode =
    code ?? (error instanceof ApiClientError ? error.code : undefined);
  const resolvedMessage =
    message ??
    (error !== undefined
      ? getErrorMessage(error)
      : "알 수 없는 오류가 발생했습니다.");

  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 rounded-lg border border-red-200 bg-red-50 px-6 py-10 text-center"
    >
      <div className="rounded-full bg-red-100 p-3 text-red-600" aria-hidden>
        <AlertTriangle className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        {resolvedCode && (
          <p className="font-mono text-xs text-red-600">{resolvedCode}</p>
        )}
        <p className="text-slate-900">{resolvedMessage}</p>
      </div>
      {onRetry && (
        <Button
          variant="outline"
          onClick={onRetry}
          className="border-red-200 text-red-700 hover:bg-red-100"
        >
          <RotateCw className="mr-2 h-4 w-4" aria-hidden /> 다시 시도
        </Button>
      )}
    </div>
  );
}
