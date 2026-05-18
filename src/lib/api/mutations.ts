import { apiDelete, apiFetch, apiPost, apiPut } from "@/lib/http";
import type {
  Activity,
  BulkImportResult,
  CalculationRun,
  ProductDetail,
} from "@/types/api";
import type { ProductCreateInput } from "@/lib/validations/product";
import type { ActivityInput } from "@/lib/validations/activity";

/**
 * 모든 변이 함수는 봉투를 푼 `data`를 그대로 반환한다.
 * 실패 시 `ApiClientError`(code/fields 포함)가 throw 되므로 호출부에서
 * try/catch + RHF setError 매핑이 가능하다.
 */

export const createProduct = (input: ProductCreateInput) =>
  apiPost<ProductDetail>("/api/products", input);

export const createActivity = (productId: string, input: ActivityInput) =>
  apiPost<Activity>(`/api/products/${productId}/activities`, input);

export const updateActivity = (id: string, input: ActivityInput) =>
  apiPut<Activity>(`/api/activities/${id}`, input);

export const deleteActivity = (id: string) =>
  apiDelete<{ id: string }>(`/api/activities/${id}`);

export const runCalculation = (productId: string) =>
  apiPost<CalculationRun>(`/api/products/${productId}/calculate`, {});

/**
 * CSV 본문(text/csv)을 raw body 로 전송.
 * `apiFetch` 기본 Content-Type(application/json) 을 헤더로 덮어쓴다.
 */
export const bulkImportCsv = (
  productId: string,
  csvText: string,
  mode: "append" | "replace",
) =>
  apiFetch<BulkImportResult>(
    `/api/products/${productId}/activities/bulk?mode=${mode}`,
    {
      method: "POST",
      headers: { "Content-Type": "text/csv" },
      body: csvText,
    },
  );
