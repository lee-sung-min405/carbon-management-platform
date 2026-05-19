import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";

import {
  CSV_HEADER,
  XLSX_MIME,
  XlsxParseError,
  xlsxBufferToCsvText,
} from "@/lib/csv/xlsx-to-rows";

/**
 * 인메모리 워크북을 만들어 buffer 로 직렬화 후, `xlsxBufferToCsvText` 가
 * `parseActivityCsv` 와 호환되는 CSV 텍스트(헤더 + 데이터 행) 를 반환하는지 검증한다.
 */
function buildWorkbookBuffer(
  rows: Array<Array<string | number>>,
  sheetName = "Sheet1",
): Buffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

describe("xlsxBufferToCsvText", () => {
  it("XLSX_MIME 상수는 OOXML spreadsheet MIME 와 일치한다", () => {
    expect(XLSX_MIME).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
  });

  it("첫 시트의 헤더 + 데이터 행을 CSV_HEADER 호환 텍스트로 변환한다", () => {
    const buf = buildWorkbookBuffer([
      [...CSV_HEADER],
      ["2025-01-01", "전기", "한국전력", 110, "kWh"],
      ["2025-01-01", "원소재", "플라스틱 1", 230, "kg"],
    ]);

    const csv = xlsxBufferToCsvText(buf);
    const lines = csv.trim().split(/\r?\n/);

    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe(CSV_HEADER.join(","));
    expect(lines[1]).toBe("2025-01-01,전기,한국전력,110,kWh");
    expect(lines[2]).toBe("2025-01-01,원소재,플라스틱 1,230,kg");
  });

  it("두 번째 시트는 무시하고 첫 시트만 변환한다", () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([[...CSV_HEADER], ["d", "전기", "x", 1, "kWh"]]),
      "First",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([["IGNORED"]]),
      "Second",
    );
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

    const csv = xlsxBufferToCsvText(buf);
    expect(csv).toContain(CSV_HEADER.join(","));
    expect(csv).not.toContain("IGNORED");
  });

  it("첫 시트가 비어 있으면 XlsxParseError 를 던진다", () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[]]), "Empty");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

    expect(() => xlsxBufferToCsvText(buf)).toThrow(XlsxParseError);
  });
});
