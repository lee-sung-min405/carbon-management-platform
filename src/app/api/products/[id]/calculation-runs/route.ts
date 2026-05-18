import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/api/response";

/**
 * GET /api/products/[id]/calculation-runs
 *
 * 제품의 과거 계산 실행 이력을 최신순으로 반환.
 * 기본적으로 items는 포함하지 않고 메타만 돌려준다 (목록 화면 최적화).
 * `?include=items` 쿼리가 있으면 각 run의 항목까지 포함한다.
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  const productId = params.id;
  if (!productId) return fail(400, "제품 ID가 필요합니다.");

  const url = new URL(request.url);
  const includeItems = url.searchParams.get("include") === "items";

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) return fail(404, "해당 제품을 찾을 수 없습니다.");

    const runs = await prisma.calculationRun.findMany({
      where: { productId },
      orderBy: { runAt: "desc" },
      include: includeItems ? { items: true } : undefined,
    });

    return ok(runs);
  } catch (err) {
    console.error(
      `[GET /api/products/${productId}/calculation-runs] failed`,
      err,
    );
    return fail(500, "계산 이력을 불러오지 못했습니다.");
  }
}
