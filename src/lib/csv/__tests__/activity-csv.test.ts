import { describe, expect, it } from "vitest";

import {
  CSV_HEADER,
  CsvParseError,
  parseActivityCsv,
  parseActivityCsvRow,
} from "../activity-csv";

const HEADER_LINE = CSV_HEADER.join(",");

describe("parseActivityCsvRow", () => {
  it("전기 1행을 USE/SCOPE_2/한국전력 매핑으로 변환한다", () => {
    const parsed = parseActivityCsvRow(
      ["2025-01-01", "전기", "한국전력", "110", "kWh"],
      1,
    );
    expect(parsed).toMatchObject({
      stageCode: "USE",
      factorName: "전기 (한국전력 기본값)",
      amount: 110,
      unit: "kWh",
      type: "전기",
    });
    expect(parsed.occurredOn.toISOString()).toBe("2025-01-01T00:00:00.000Z");
  });

  it("운송 1행을 TRANSPORT + ton-km 모드로 변환한다", () => {
    const parsed = parseActivityCsvRow(
      ["2025-05-01", "운송", "트럭", "12", "ton-km"],
      1,
    );
    expect(parsed.stageCode).toBe("TRANSPORT");
    expect(parsed.factorName).toBe("운송 (트럭)");
    expect(parsed.amount).toBe(12);
    expect(parsed.unit).toBe("ton-km");
  });

  it("원소재는 설명으로 플라스틱1/2를 구분한다", () => {
    expect(
      parseActivityCsvRow(
        ["2025-03-01", "원소재", "플라스틱 2", "23", "kg"],
        1,
      ).factorName,
    ).toBe("원소재 (플라스틱 2)");
    expect(
      parseActivityCsvRow(
        ["2025-01-01", "원소재", "플라스틱 1", "230", "kg"],
        1,
      ).factorName,
    ).toBe("원소재 (플라스틱 1)");
  });

  it("알 수 없는 활동 유형은 에러를 던진다", () => {
    expect(() =>
      parseActivityCsvRow(["2025-01-01", "냉매", "R-410A", "1", "kg"], 1),
    ).toThrow(/알 수 없는 활동 유형/);
  });

  it("단위 불일치는 에러를 던진다 (전기에 kg)", () => {
    expect(() =>
      parseActivityCsvRow(["2025-01-01", "전기", "한국전력", "110", "kg"], 1),
    ).toThrow(/단위 불일치/);
  });

  it("량이 0 이하이면 에러를 던진다", () => {
    expect(() =>
      parseActivityCsvRow(["2025-01-01", "전기", "한국전력", "0", "kWh"], 1),
    ).toThrow(/0보다 큰/);
    expect(() =>
      parseActivityCsvRow(["2025-01-01", "전기", "한국전력", "-1", "kWh"], 1),
    ).toThrow(/0보다 큰/);
  });

  it("일자가 잘못된 형식이면 에러를 던진다", () => {
    expect(() =>
      parseActivityCsvRow(["bad-date", "전기", "한국전력", "110", "kWh"], 1),
    ).toThrow(/일자 형식/);
  });
});

describe("parseActivityCsv", () => {
  it("자료 30행(헤더 포함 31줄)을 모두 파싱한다", () => {
    const lines: string[] = [HEADER_LINE];
    // R16 시드와 동일한 30행
    const rows: Array<[string, string, string, number, string]> = [
      ["2025-01-01", "전기", "한국전력", 110, "kWh"],
      ["2025-02-01", "전기", "한국전력", 112, "kWh"],
      ["2025-03-01", "전기", "한국전력", 115, "kWh"],
      ["2025-04-01", "전기", "한국전력", 130, "kWh"],
      ["2025-05-01", "전기", "한국전력", 120, "kWh"],
      ["2025-06-01", "전기", "한국전력", 110, "kWh"],
      ["2025-07-01", "전기", "한국전력", 120, "kWh"],
      ["2025-08-01", "전기", "한국전력", 111, "kWh"],
      ["2025-05-01", "전기", "한국전력", 101, "kWh"],
      ["2025-01-01", "원소재", "플라스틱 1", 230, "kg"],
      ["2025-02-01", "원소재", "플라스틱 1", 340, "kg"],
      ["2025-03-01", "원소재", "플라스틱 2", 23, "kg"],
      ["2025-03-01", "원소재", "플라스틱 1", 430, "kg"],
      ["2025-04-01", "원소재", "플라스틱 1", 510, "kg"],
      ["2025-05-01", "원소재", "플라스틱 1", 424, "kg"],
      ["2025-05-01", "원소재", "플라스틱 2", 40, "kg"],
      ["2025-06-01", "원소재", "플라스틱 1", 450, "kg"],
      ["2025-07-01", "원소재", "플라스틱 1", 340, "kg"],
      ["2025-07-01", "원소재", "플라스틱 2", 43, "kg"],
      ["2025-08-01", "원소재", "플라스틱 1", 230, "kg"],
      ["2025-05-01", "원소재", "플라스틱 1", 232, "kg"],
      ["2025-01-01", "운송", "트럭", 41, "ton-km"],
      ["2025-02-01", "운송", "트럭", 211, "ton-km"],
      ["2025-03-01", "운송", "트럭", 123, "ton-km"],
      ["2025-04-01", "운송", "트럭", 42, "ton-km"],
      ["2025-05-01", "운송", "트럭", 123, "ton-km"],
      ["2025-06-01", "운송", "트럭", 123, "ton-km"],
      ["2025-07-01", "운송", "트럭", 41, "ton-km"],
      ["2025-08-01", "운송", "트럭", 123, "ton-km"],
      ["2025-05-01", "운송", "트럭", 12, "ton-km"],
    ];
    for (const r of rows) lines.push(r.join(","));

    const parsed = parseActivityCsv(lines.join("\n"));
    expect(parsed).toHaveLength(30);
    expect(parsed.filter((p) => p.stageCode === "USE")).toHaveLength(9);
    expect(parsed.filter((p) => p.stageCode === "RAW_MATERIAL")).toHaveLength(12);
    expect(parsed.filter((p) => p.stageCode === "TRANSPORT")).toHaveLength(9);
  });

  it("헤더가 일치하지 않으면 CsvParseError를 던진다", () => {
    expect(() =>
      parseActivityCsv(["date,type,desc,amount,unit", "2025-01-01,전기,한국전력,110,kWh"].join("\n")),
    ).toThrow(CsvParseError);
  });

  it("여러 행 오류를 한꺼번에 모은다 (조기 중단 X)", () => {
    const csv = [
      HEADER_LINE,
      "2025-01-01,전기,한국전력,110,kg", // 단위 mismatch
      "bad,전기,한국전력,110,kWh", // 일자 형식
      "2025-01-01,냉매,R-410A,1,kg", // 알 수 없는 유형
    ].join("\n");

    try {
      parseActivityCsv(csv);
      expect.fail("should throw");
    } catch (err) {
      expect(err).toBeInstanceOf(CsvParseError);
      const issues = (err as CsvParseError).issues;
      expect(issues).toHaveLength(3);
      expect(issues.map((i) => i.row)).toEqual([1, 2, 3]);
    }
  });

  it("빈 본문은 CsvParseError", () => {
    expect(() => parseActivityCsv("")).toThrow(CsvParseError);
    expect(() => parseActivityCsv("   \n  \n")).toThrow(CsvParseError);
  });
});
