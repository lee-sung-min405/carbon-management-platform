import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/api/response";
import { requireProduct } from "@/lib/api/handlers";

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
  const productCheck = await requireProduct(params.id);
  if (!productCheck.ok) return productCheck.response;
  const productId = productCheck.product.id;

  const url = new URL(request.url);
  const includeItems = url.searchParams.get("include") === "items";

  try {
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
