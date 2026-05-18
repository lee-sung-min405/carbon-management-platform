/**
 * 활동 CSV 파서 — 과제 제공 자료(CT-045)의 표 형식을 그대로 임포트하기 위한 헬퍼.
 *
 * 외부 의존 0 (CSV/Excel 라이브러리 미사용).
 * 본 파서는 과제 자료의 컬럼 4종(전기·원소재·운송)만 처리하면 충분하며,
 * 일반 RFC 4180 완전 호환은 비-목표이다.
 *
 * 입력 헤더(정확히 일치 필요):
 *   `일자,활동 유형,설명,량,단위`
 *
 * 출력은 `ParsedActivityRow[]` — 라우트 핸들러는 이를 받아 factor name → factorId
 * 해석 후 Prisma `createMany`로 일괄 적재한다 (본 모듈에는 DB 의존이 없다).
 */

import type { StageCode } from "@/domain/pcf/stages";

export const CSV_HEADER = ["일자", "활동 유형", "설명", "량", "단위"] as const;

/**
 * 활동 유형 + 설명 → (stageCode, 매칭할 factor name, 기대 단위) 매핑.
 * 시드(R16)에 등록된 4종 factor와 1:1 대응. 새로운 자료가 들어오면 본 표에 추가하면 된다.
 */
type ActivityRule = {
  stageCode: StageCode;
  factorName: string;
  expectedUnit: string;
  /** 설명 컬럼이 가변일 수 있는 경우 매칭 함수. 미지정 시 모든 설명 허용. */
  matchDesc?: (desc: string) => boolean;
};

const ACTIVITY_RULES: Array<{ type: string } & ActivityRule> = [
  {
    type: "전기",
    stageCode: "USE",
    factorName: "전기 (한국전력 기본값)",
    expectedUnit: "kWh",
  },
  {
    type: "원소재",
    stageCode: "RAW_MATERIAL",
    factorName: "원소재 (플라스틱 1)",
    expectedUnit: "kg",
    matchDesc: (d) => d === "플라스틱 1",
  },
  {
    type: "원소재",
    stageCode: "RAW_MATERIAL",
    factorName: "원소재 (플라스틱 2)",
    expectedUnit: "kg",
    matchDesc: (d) => d === "플라스틱 2",
  },
  {
    type: "운송",
    stageCode: "TRANSPORT",
    factorName: "운송 (트럭)",
    expectedUnit: "ton-km",
  },
];

export type ParsedActivityRow = {
  /** 1-based 원본 행 번호(헤더 제외, 데이터 행 기준). */
  rowNumber: number;
  occurredOn: Date;
  type: string;
  desc: string;
  amount: number;
  unit: string;
  stageCode: StageCode;
  factorName: string;
};

export class CsvParseError extends Error {
  readonly issues: Array<{ row: number; message: string }>;
  constructor(issues: Array<{ row: number; message: string }>) {
    super(`CSV 파싱 실패 (${issues.length}건)`);
    this.name = "CsvParseError";
    this.issues = issues;
  }
}

/** 단일 행(문자열 배열)을 ParsedActivityRow로 변환. 실패 시 throw. */
export function parseActivityCsvRow(
  row: string[],
  rowNumber: number,
): ParsedActivityRow {
  if (row.length !== CSV_HEADER.length) {
    throw new Error(
      `컬럼 수가 헤더(${CSV_HEADER.length})와 다릅니다 (실제 ${row.length}).`,
    );
  }
  const [dateRaw, typeRaw, descRaw, amountRaw, unitRaw] = row.map((c) =>
    c.trim(),
  );

  if (!dateRaw) throw new Error("일자가 비어 있습니다.");
  // YYYY-MM-DD 또는 ISO 부분 허용. Date 파싱 실패 시 NaN.
  const occurredOn = new Date(
    /\d{4}-\d{2}-\d{2}T/.test(dateRaw)
      ? dateRaw
      : `${dateRaw}T00:00:00.000Z`,
  );
  if (Number.isNaN(occurredOn.getTime())) {
    throw new Error(`일자 형식이 올바르지 않습니다: "${dateRaw}"`);
  }

  if (!typeRaw) throw new Error("활동 유형이 비어 있습니다.");
  if (!unitRaw) throw new Error("단위가 비어 있습니다.");

  // 활동 유형 후보 필터
  const candidates = ACTIVITY_RULES.filter((r) => r.type === typeRaw);
  if (candidates.length === 0) {
    const supported = Array.from(
      new Set(ACTIVITY_RULES.map((r) => r.type)),
    ).join(", ");
    throw new Error(
      `알 수 없는 활동 유형 "${typeRaw}" (지원: ${supported}).`,
    );
  }
  const rule =
    candidates.find((r) => !r.matchDesc || r.matchDesc(descRaw)) ?? null;
  if (!rule) {
    throw new Error(
      `활동 유형 "${typeRaw}"에 대해 설명 "${descRaw}"을(를) 매칭할 수 없습니다.`,
    );
  }

  if (unitRaw !== rule.expectedUnit) {
    throw new Error(
      `단위 불일치: "${typeRaw}/${descRaw}"은(는) ${rule.expectedUnit}을(를) 기대했으나 "${unitRaw}"이(가) 입력되었습니다.`,
    );
  }

  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`량(amount)은 0보다 큰 숫자여야 합니다: "${amountRaw}"`);
  }

  return {
    rowNumber,
    occurredOn,
    type: typeRaw,
    desc: descRaw,
    amount,
    unit: unitRaw,
    stageCode: rule.stageCode,
    factorName: rule.factorName,
  };
}

/**
 * CSV 본문 전체를 파싱한다.
 *
 * - 첫 줄은 `CSV_HEADER`와 정확히 일치해야 한다.
 * - 빈 줄은 무시한다.
 * - 행 단위 오류는 모두 수집해 `CsvParseError.issues`로 한꺼번에 보고한다 (조기 중단 X).
 *
 * 단순한 쉼표 split만 수행한다 — 따옴표/이스케이프된 쉼표가 포함된 자료는 비-목표.
 */
export function parseActivityCsv(text: string): ParsedActivityRow[] {
  if (!text || !text.trim()) {
    throw new CsvParseError([{ row: 0, message: "CSV 본문이 비어 있습니다." }]);
  }

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 1) {
    throw new CsvParseError([{ row: 0, message: "CSV 본문이 비어 있습니다." }]);
  }

  const headerCells = lines[0].split(",").map((c) => c.trim());
  if (
    headerCells.length !== CSV_HEADER.length ||
    headerCells.some((c, i) => c !== CSV_HEADER[i])
  ) {
    throw new CsvParseError([
      {
        row: 0,
        message: `헤더가 일치하지 않습니다. 기대: "${CSV_HEADER.join(",")}", 실제: "${lines[0]}"`,
      },
    ]);
  }

  const issues: Array<{ row: number; message: string }> = [];
  const parsed: ParsedActivityRow[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const rowNumber = i; // 1-based 데이터 행 번호 (헤더 다음 줄이 1)
    const cells = lines[i].split(",").map((c) => c.trim());
    try {
      parsed.push(parseActivityCsvRow(cells, rowNumber));
    } catch (err) {
      issues.push({
        row: rowNumber,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (issues.length > 0) {
    throw new CsvParseError(issues);
  }
  if (parsed.length === 0) {
    throw new CsvParseError([
      { row: 0, message: "데이터 행이 0건입니다." },
    ]);
  }
  return parsed;
}
