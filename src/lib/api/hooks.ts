"use client";

import useSWR from "swr";
import type { SWRConfiguration } from "swr";
import type {
  Factor,
  Health,
  ProductDetail,
  ProductListItem,
  RunMeta,
} from "@/types/api";
import type { StageCode } from "@/domain/pcf/stages";
import type { GhgScope } from "@/domain/pcf/scopes";

/**
 * SWR 키 규약
 * - 단순 문자열 키 → 그대로 GET
 * - `[url, params]` 튜플 키 → providers.tsx fetcher 가 query string 으로 직렬화
 *
 * 응답 타입은 `src/types/api.ts` 의 좁은 인터페이스를 사용한다.
 */

export const useProducts = (config?: SWRConfiguration<ProductListItem[]>) =>
  useSWR<ProductListItem[]>("/api/products", config);

export const useProduct = (
  id: string | null | undefined,
  config?: SWRConfiguration<ProductDetail>,
) => useSWR<ProductDetail>(id ? `/api/products/${id}` : null, config);

export interface FactorQuery {
  stage?: StageCode;
  scope?: GhgScope;
}

export const useFactors = (
  query?: FactorQuery,
  config?: SWRConfiguration<Factor[]>,
) =>
  useSWR<Factor[]>(
    query && (query.stage || query.scope)
      ? (["/api/emission-factors", query] as const)
      : "/api/emission-factors",
    config,
  );

export const useRuns = (
  productId: string | null | undefined,
  config?: SWRConfiguration<RunMeta[]>,
) =>
  useSWR<RunMeta[]>(
    productId ? `/api/products/${productId}/calculation-runs` : null,
    config,
  );

export const useHealth = (config?: SWRConfiguration<Health>) =>
  useSWR<Health>("/api/health", { refreshInterval: 30_000, ...config });
