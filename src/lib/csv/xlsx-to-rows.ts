/**
 * XLSX → CSV 변환 헬퍼.
 *
 * 과제 안내(이미지 2 노란 박스) "제공된 Excel 파일을 별도 가공 없이 직접 임포트"
 * 가점 항목을 충족하기 위한 얇은 어댑터다. xlsx 본문을 첫 시트 기준으로
 * CSV 텍스트로 변환해 기존 `parseActivityCsv` 파이프라인을 그대로 재사용한다.
 *
 * 의도된 비-목표:
 *   - 다중 시트 처리 (첫 시트만 사용)
 *   - 셀 서식/병합/수식 보존 (sheet_to_csv 의 raw 변환만)
 *   - 인메모리 0 카피 (Buffer → ArrayBuffer 변환 1회 수용)
 */

import * as XLSX from "xlsx";

import { CSV_HEADER } from "@/lib/csv/activity-csv";

export const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export class XlsxParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "XlsxParseError";
  }
}

/**
 * xlsx 바이너리를 첫 시트 → CSV 문자열로 변환한다.
 *
 * - 입력은 Buffer | Uint8Array | ArrayBuffer 모두 허용.
 * - 워크북에 시트가 없으면 `XlsxParseError`.
 * - 반환 CSV 의 첫 줄은 `parseActivityCsv` 가 기대하는 `CSV_HEADER`
 *   ("일자,활동 유형,설명,량,단위") 와 일치해야 한다 (검증은 후속 파서 책임).
 */
export function xlsxBufferToCsvText(
  input: Buffer | Uint8Array | ArrayBuffer,
): string {
  // Buffer extends Uint8Array — instanceof 한 번으로 모두 좁혀진다.
  const u8 = input instanceof Uint8Array ? input : new Uint8Array(input);

  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(u8, { type: "array" });
  } catch (err) {
    throw new XlsxParseError(
      `xlsx 파일을 읽지 못했습니다: ${(err as Error).message}`,
    );
  }

  const firstName = wb.SheetNames[0];
  if (!firstName) {
    throw new XlsxParseError("xlsx 워크북에 시트가 없습니다.");
  }
  const sheet = wb.Sheets[firstName];
  if (!sheet) {
    throw new XlsxParseError(`첫 시트("${firstName}") 를 찾을 수 없습니다.`);
  }

  // sheet_to_csv 는 RFC 4180 따옴표 처리/줄바꿈 정규화를 수행한다.
  // `blankrows: false` 로 빈 행을 제거해 후속 `parseActivityCsv` 의 행 번호와 어긋나지 않게 한다.
  const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
  if (!csv.trim()) {
    throw new XlsxParseError(`첫 시트("${firstName}") 가 비어 있습니다.`);
  }
  return csv;
}

/** CSV_HEADER 재노출 — 호출부가 한 곳에서 import 하도록. */
export { CSV_HEADER };
