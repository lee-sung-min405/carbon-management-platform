import { prisma } from "@/lib/db";
import { ActivityBulkInput } from "@/lib/validations/activity";
import { fail, failFromZod, ok } from "@/lib/api/response";
import { API_ERROR_CODES } from "@/lib/api/error-codes";
import {
  handlePrismaError,
  parseJsonBody,
  requireProduct,
  toActivityWriteData,
} from "@/lib/api/handlers";
import {
  CSV_HEADER,
  CsvParseError,
  parseActivityCsv,
  type ParsedActivityRow,
} from "@/lib/csv/activity-csv";
import {
  XLSX_MIME,
  XlsxParseError,
  xlsxBufferToCsvText,
} from "@/lib/csv/xlsx-to-rows";

/**
 * POST /api/products/[id]/activities/bulk
 * 활동 데이터를 일괄 임포트한다 (R17 — 과제 자료 직접 임포트 가점).
 *
 * Content-Type 분기:
 *   - `application/json` → `ActivityBulkInput` ({ items, mode })
 *   - `text/csv`         → 본문을 `parseActivityCsv`로 파싱
 *                          (mode는 쿼리스트링 `?mode=replace`로 지정, 기본 append)
 *   - `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
 *     → xlsx 본문 첫 시트를 CSV 로 변환 후 동일 파서 재사용
 *       (과제 안내 이미지 2 노란 박스 "Excel 직접 임포트" 가점)
 *
 * 모든 행 검증/factor 매칭이 통과한 경우에만 트랜잭션 안에서 일괄 적재한다.
 * `mode=replace` 는 deleteMany 후 createMany (멱등 임포트 시연).
 *
 * 응답:
 *   - 201 `{ data: { inserted, mode, productId } }`
 *   - 400 `{ error: { code, message, fields? } }` (Zod / CSV 파싱 / factor 매칭 실패)
 *   - 404 제품 미존재
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const productCheck = await requireProduct(params.id);
  if (!productCheck.ok) return productCheck.response;

  const contentType = (request.headers.get("content-type") ?? "")
    .split(";")[0]
    .trim()
    .toLowerCase();

  // 1) 입력을 정규화된 형태로 변환: { rows: Array<{ stageCode, factorName, ... }>, mode }
  let rows: Array<{
    stageCode: ParsedActivityRow["stageCode"];
    factorName?: string;
    factorId?: string;
    name: string;
    amount: number;
    unit: string;
    allocationRatio: number;
    weightKg?: number | null;
    distanceKm?: number | null;
    occurredOn?: Date | null;
    note?: string | null;
  }>;
  let mode: "append" | "replace";

  if (contentType === "application/json" || contentType === "") {
    const bodyResult = await parseJsonBody(request);
    if (!bodyResult.ok) return bodyResult.response;
    const parsed = ActivityBulkInput.safeParse(bodyResult.body);
    if (!parsed.success) return failFromZod(parsed.error);

    mode = parsed.data.mode;
    rows = parsed.data.items.map((item) => {
      const write = toActivityWriteData(item);
      return {
        stageCode: item.stageCode,
        factorId: item.factorId,
        name: write.name,
        amount: write.amount,
        unit: write.unit,
        allocationRatio: write.allocationRatio,
        weightKg: write.weightKg,
        distanceKm: write.distanceKm,
        occurredOn: write.occurredOn,
        note: write.note,
      };
    });
  } else if (contentType === "text/csv" || contentType === XLSX_MIME) {
    const url = new URL(request.url);
    const modeParam = url.searchParams.get("mode") ?? "append";
    if (modeParam !== "append" && modeParam !== "replace") {
      return fail(400, `mode는 append | replace 만 허용됩니다 (실제: ${modeParam}).`, {
        code: API_ERROR_CODES.VALIDATION_ERROR,
        fields: { mode: ["append | replace"] },
      });
    }
    mode = modeParam;

    let text: string;
    if (contentType === XLSX_MIME) {
      // xlsx → CSV 텍스트로 변환 후 기존 파이프라인 재사용.
      let buf: ArrayBuffer;
      try {
        buf = await request.arrayBuffer();
      } catch {
        return fail(400, "xlsx 본문을 읽지 못했습니다.", {
          code: API_ERROR_CODES.CSV_PARSE_ERROR,
        });
      }
      try {
        text = xlsxBufferToCsvText(buf);
      } catch (err) {
        if (err instanceof XlsxParseError) {
          return fail(400, err.message, {
            code: API_ERROR_CODES.CSV_PARSE_ERROR,
          });
        }
        throw err;
      }
    } else {
      try {
        text = await request.text();
      } catch {
        return fail(400, "CSV 본문을 읽지 못했습니다.", {
          code: API_ERROR_CODES.CSV_PARSE_ERROR,
        });
      }
    }

    let parsedRows: ParsedActivityRow[];
    try {
      parsedRows = parseActivityCsv(text);
    } catch (err) {
      if (err instanceof CsvParseError) {
        const fields: Record<string, string[]> = {};
        for (const issue of err.issues) {
          (fields[`row.${issue.row}`] ??= []).push(issue.message);
        }
        return fail(
          400,
          `CSV ${err.issues.length}개 행에서 오류가 발견되었습니다.`,
          { code: API_ERROR_CODES.CSV_PARSE_ERROR, fields },
        );
      }
      throw err;
    }

    rows = parsedRows.map((r) => ({
      stageCode: r.stageCode,
      factorName: r.factorName,
      name: `${r.type} · ${r.desc} (${r.occurredOn.toISOString().slice(0, 10)})`,
      amount: r.amount,
      unit: r.unit,
      allocationRatio: 1,
      weightKg: null,
      distanceKm: null,
      occurredOn: r.occurredOn,
      note: null,
    }));
  } else {
    return fail(
      415,
      `지원하지 않는 Content-Type: ${contentType}. application/json · text/csv · ${XLSX_MIME} 중 하나를 사용해주세요.`,
      { code: API_ERROR_CODES.UNSUPPORTED_MEDIA_TYPE },
    );
  }

  // 2) CSV 경로의 factor name → id 일괄 해석 (DB 1회 조회).
  const namesToResolve = Array.from(
    new Set(rows.filter((r) => !r.factorId && r.factorName).map((r) => r.factorName!)),
  );
  if (namesToResolve.length > 0) {
    const found = await prisma.emissionFactor.findMany({
      where: { name: { in: namesToResolve } },
      select: { id: true, name: true, stageCode: true },
    });
    const byName = new Map(found.map((f) => [f.name, f]));

    const missing = namesToResolve.filter((n) => !byName.has(n));
    if (missing.length > 0) {
      return fail(
        400,
        `시드에 등록되지 않은 배출계수가 있습니다: ${missing.join(", ")}. \`npm run db:seed\`를 실행해주세요.`,
        {
          code: API_ERROR_CODES.FACTOR_NOT_FOUND,
          fields: { factorName: missing },
        },
      );
    }

    for (const r of rows) {
      if (r.factorId || !r.factorName) continue;
      const f = byName.get(r.factorName)!;
      if (f.stageCode !== r.stageCode) {
        return fail(
          400,
          `배출계수 단계 불일치: "${r.factorName}"은 ${f.stageCode} 단계용입니다.`,
          { code: API_ERROR_CODES.FACTOR_STAGE_MISMATCH },
        );
      }
      r.factorId = f.id;
    }
  }

  // 3) 트랜잭션 안에서 일괄 적재.
  try {
    const result = await prisma.$transaction(async (tx) => {
      if (mode === "replace") {
        await tx.productActivity.deleteMany({
          where: { productId: params.id },
        });
        // 기존 활동을 지웠으므로 과거 계산 런도 일관성을 위해 함께 제거.
        await tx.calculationRun.deleteMany({
          where: { productId: params.id },
        });
      }
      const created = await tx.productActivity.createMany({
        data: rows.map((r) => ({
          productId: params.id,
          stageCode: r.stageCode,
          name: r.name,
          amount: r.amount,
          unit: r.unit,
          factorId: r.factorId!,
          allocationRatio: r.allocationRatio,
          weightKg: r.weightKg ?? null,
          distanceKm: r.distanceKm ?? null,
          occurredOn: r.occurredOn ?? null,
          note: r.note ?? null,
        })),
      });
      return created.count;
    });

    return ok(
      { inserted: result, mode, productId: params.id },
      { status: 201 },
    );
  } catch (err) {
    return handlePrismaError(err, "활동 일괄 임포트에 실패했습니다.");
  }
}

// CSV 헤더 표면화 (CLI 또는 외부 도구가 GET으로 헤더만 받아가도록):
// 비-목표지만 작은 디스커버리 헬퍼.
export async function GET() {
  return ok({
    header: CSV_HEADER,
    example:
      `${CSV_HEADER.join(",")}\n` +
      `2025-01-01,전기,한국전력,110,kWh\n` +
      `2025-01-01,원소재,플라스틱 1,230,kg\n` +
      `2025-01-01,운송,트럭,41,ton-km`,
    modes: ["append", "replace"],
  });
}
