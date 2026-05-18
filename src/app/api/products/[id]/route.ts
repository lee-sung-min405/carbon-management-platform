import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/api/response";
import { API_ERROR_CODES } from "@/lib/api/error-codes";

/**
 * GET /api/products/[id]
 * 제품 + 활동 + 활동의 배출계수 메타 + 최근 계산 1건.
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const { id } = params;
  if (!id)
    return fail(400, "제품 ID가 필요합니다.", {
      code: API_ERROR_CODES.INVALID_PRODUCT_ID,
    });

  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        activities: {
          orderBy: { stageCode: "asc" },
          include: {
            factor: {
              select: {
                id: true,
                name: true,
                stageCode: true,
                unit: true,
                value: true,
                source: true,
                isDemo: true,
              },
            },
          },
        },
        runs: {
          orderBy: { runAt: "desc" },
          take: 1,
          select: { id: true, runAt: true, totalKgCO2e: true },
        },
      },
    });

    if (!product)
      return fail(404, "해당 제품을 찾을 수 없습니다.", {
        code: API_ERROR_CODES.PRODUCT_NOT_FOUND,
      });
    return ok(product);
  } catch (err) {
    console.error(`[GET /api/products/${id}] failed`, err);
    return fail(500, "제품 정보를 불러오지 못했습니다.", {
      code: API_ERROR_CODES.INTERNAL_ERROR,
    });
  }
}
