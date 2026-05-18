import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { ProductCreateInput } from "@/lib/validations/product";
import { failFromZod, fail, ok } from "@/lib/api/response";
import { API_ERROR_CODES } from "@/lib/api/error-codes";

/**
 * GET /api/products
 * 제품 목록 (활동 수, 마지막 계산일 포함).
 * 대시보드 선택기에서 사용.
 */
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { activities: true } },
        runs: {
          orderBy: { runAt: "desc" },
          take: 1,
          select: { runAt: true, totalKgCO2e: true },
        },
      },
    });

    const data = products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      functionalUnit: p.functionalUnit,
      description: p.description,
      createdAt: p.createdAt,
      activityCount: p._count.activities,
      lastRun: p.runs[0] ?? null,
    }));

    return ok(data);
  } catch (err) {
    console.error("[GET /api/products] failed", err);
    return fail(500, "제품 목록을 불러오지 못했습니다.", {
      code: API_ERROR_CODES.INTERNAL_ERROR,
    });
  }
}

/**
 * POST /api/products
 * Body: { name, sku?, functionalUnit, description? }
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, "요청 본문(JSON)을 파싱할 수 없습니다.", {
      code: API_ERROR_CODES.INVALID_JSON,
    });
  }

  const parsed = ProductCreateInput.safeParse(body);
  if (!parsed.success) return failFromZod(parsed.error);

  try {
    const product = await prisma.product.create({ data: parsed.data });
    return ok(product, { status: 201 });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return fail(409, "이미 사용 중인 SKU입니다.", {
        code: API_ERROR_CODES.SKU_CONFLICT,
      });
    }
    console.error("[POST /api/products] failed", err);
    return fail(500, "제품을 생성하지 못했습니다.", {
      code: API_ERROR_CODES.INTERNAL_ERROR,
    });
  }
}
