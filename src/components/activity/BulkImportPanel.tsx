"use client";

import { useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Loader2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CSV_HEADER } from "@/lib/csv/activity-csv";
import { bulkImportCsv } from "@/lib/api/mutations";
import { ApiClientError } from "@/lib/http";
import { getErrorMessage } from "@/lib/api/error-messages";
import type { BulkImportResult } from "@/types/api";

export interface BulkImportPanelProps {
  productId: string;
  /** 업로드 성공 직후 호출. 부모는 product mutate + (선택) 토스트 표시. */
  onUploaded?: (result: BulkImportResult) => void;
}

type ImportMode = "append" | "replace";

interface PreviewState {
  fileName: string;
  fileSize: number;
  text: string;
  headerOk: boolean;
  headerActual: string[];
  rows: string[][];
  totalRows: number;
}

/**
 * CSV 임포트 패널.
 * - 드래그앤드롭 + 파일 선택
 * - 클라이언트 사전 검증: 헤더 5컬럼 확인 + 첫 5행 미리보기
 * - 모드 라디오 (append/replace) + replace 경고
 * - 업로드: bulkImportCsv → 성공 시 inserted/deleted 표시 + onUploaded
 * - 서버 CSV_PARSE_ERROR.fields(`row.N: string[]`) → 행 단위 오류 목록
 */
export function BulkImportPanel({ productId, onUploaded }: BulkImportPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [mode, setMode] = useState<ImportMode>("append");
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<{ row: string; msgs: string[] }[]>(
    [],
  );

  const handleFile = async (file: File) => {
    setError(null);
    setRowErrors([]);
    setResult(null);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      const header = (lines[0] ?? "").split(",").map((s) => s.trim());
      const headerOk =
        header.length === CSV_HEADER.length &&
        header.every((h, i) => h === CSV_HEADER[i]);
      const rows = lines.slice(1, 6).map((l) => l.split(",").map((c) => c.trim()));
      setPreview({
        fileName: file.name,
        fileSize: file.size,
        text,
        headerOk,
        headerActual: header,
        rows,
        totalRows: Math.max(0, lines.length - 1),
      });
    } catch (e) {
      setError(`파일을 읽지 못했습니다: ${(e as Error).message}`);
    }
  };

  const handleUpload = async () => {
    if (!preview) return;
    setIsUploading(true);
    setError(null);
    setRowErrors([]);
    setResult(null);
    try {
      const res = await bulkImportCsv(productId, preview.text, mode);
      setResult(res);
      onUploaded?.(res);
    } catch (e) {
      if (e instanceof ApiClientError && e.fields) {
        const list: { row: string; msgs: string[] }[] = [];
        for (const [k, v] of Object.entries(e.fields)) {
          list.push({
            row: k,
            msgs: Array.isArray(v) ? v : [String(v)],
          });
        }
        setRowErrors(list);
      }
      setError(getErrorMessage(e));
    } finally {
      setIsUploading(false);
    }
  };

  const reset = () => {
    setPreview(null);
    setResult(null);
    setError(null);
    setRowErrors([]);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-700">CSV 임포트</p>
      <p className="mt-1 text-xs text-slate-500">
        예상 헤더: {CSV_HEADER.join(", ")} · UTF-8 권장
      </p>

      {/* 드롭존 */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void handleFile(file);
        }}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="CSV 파일 업로드 영역"
        className={`mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center transition focus:outline-none focus:ring-2 focus:ring-emerald-300 ${
          drag
            ? "border-emerald-400 bg-emerald-50"
            : "border-slate-300 bg-slate-50 hover:border-slate-400"
        }`}
      >
        <Upload className="h-6 w-6 text-slate-500" aria-hidden />
        <p className="text-sm text-slate-700">
          CSV 파일을 드래그하거나 클릭해서 업로드하세요.
        </p>
        <p className="text-xs text-slate-500">.csv · UTF-8 권장</p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
      </div>

      {/* 선택된 파일 / 미리보기 */}
      {preview && (
        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50/50 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm text-slate-700">
              <FileText className="h-4 w-4 text-slate-500" aria-hidden />
              <span className="font-mono">{preview.fileName}</span>
              <span className="text-xs text-slate-500">
                ({formatBytes(preview.fileSize)} · 데이터 {preview.totalRows}행)
              </span>
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={reset}
              disabled={isUploading}
            >
              제거
            </Button>
          </div>

          {!preview.headerOk && (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-red-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <div className="text-xs">
                <p className="font-medium">CSV 헤더가 올바르지 않습니다.</p>
                <p className="mt-0.5 font-mono">
                  기대: {CSV_HEADER.join(", ")}
                </p>
                <p className="mt-0.5 font-mono">
                  실제: {preview.headerActual.join(", ") || "(빈 줄)"}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 미리보기 표 */}
      {preview && preview.headerOk && preview.rows.length > 0 && (
        <div className="mt-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            미리보기 (첫 {preview.rows.length}행)
          </p>
          <div className="mt-2 overflow-x-auto rounded-md border border-slate-200">
            <table className="w-full min-w-[520px] text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  {CSV_HEADER.map((h) => (
                    <th
                      key={h}
                      className={`px-3 py-2 ${h === "량" ? "text-right" : "text-left"}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    {row.map((c, j) => (
                      <td
                        key={j}
                        className={`px-3 py-2 ${j === 3 ? "text-right font-mono" : ""}`}
                      >
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 모드 선택 */}
      <div className="mt-5">
        <Label>업로드 모드</Label>
        <RadioGroup
          value={mode}
          onValueChange={(v) => setMode(v as ImportMode)}
          className="mt-2 space-y-2"
        >
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <RadioGroupItem value="append" /> append · 기존 활동에 추가
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <RadioGroupItem value="replace" /> replace · 기존 활동을 모두 삭제하고
            교체
          </label>
        </RadioGroup>
        {mode === "replace" && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p className="text-xs">
              기존 활동 데이터가 모두 삭제됩니다. 이 동작은 되돌릴 수 없습니다.
            </p>
          </div>
        )}
      </div>

      {/* 서버 오류 행 목록 */}
      {rowErrors.length > 0 && (
        <div className="mt-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            오류 목록 ({rowErrors.length}건)
          </p>
          <div className="mt-2 max-h-48 space-y-1.5 overflow-auto rounded-md border border-red-200 bg-red-50 p-3">
            {rowErrors.map((e, i) => (
              <p key={i} className="text-xs text-red-700">
                <span className="font-mono">{e.row}</span> · {e.msgs.join(" / ")}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* 일반 오류 */}
      {error && rowErrors.length === 0 && (
        <p className="mt-4 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}

      {/* 성공 결과 */}
      {result && (
        <div
          className="mt-4 flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-emerald-900"
          role="status"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div className="text-xs">
            <p className="font-medium">
              업로드 완료 · 신규 {result.inserted}건
              {result.deleted > 0 ? ` · 삭제 ${result.deleted}건` : ""} (mode:{" "}
              {result.mode})
            </p>
            <p className="mt-0.5">
              활동 데이터가 변경되었습니다. 다시 ‘계산 실행’ 을 눌러 PCF 를
              갱신하세요.
            </p>
          </div>
        </div>
      )}

      <div className="mt-5 flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={reset}
          disabled={isUploading || !preview}
        >
          초기화
        </Button>
        <Button
          type="button"
          onClick={handleUpload}
          disabled={
            !preview || !preview.headerOk || isUploading
          }
          className="bg-emerald-700 hover:bg-emerald-800"
        >
          {isUploading && (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden />
          )}
          CSV 업로드
        </Button>
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
