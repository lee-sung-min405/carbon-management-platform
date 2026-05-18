import { describe, expect, it } from "vitest";

import { ProductCreateInput } from "../product";

function failedPaths(input: unknown): string[] {
  const result = ProductCreateInput.safeParse(input);
  if (result.success) return [];
  return result.error.issues.map((i) => i.path.join("."));
}

describe("ProductCreateInput", () => {
  it("정상 값 → success", () => {
    const result = ProductCreateInput.safeParse({
      name: "Laptop X1",
      sku: "LX1-2026",
      functionalUnit: "1 unit",
      description: "데모용",
    });
    expect(result.success).toBe(true);
  });

  it("name 빈 문자열 → 실패", () => {
    expect(failedPaths({ name: "", functionalUnit: "1 unit" })).toContain(
      "name",
    );
  });

  it("sku 빈 문자열 → undefined 정규화", () => {
    const result = ProductCreateInput.safeParse({
      name: "X",
      sku: "",
      functionalUnit: "1 unit",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sku).toBeUndefined();
    }
  });

  it("functionalUnit 누락 → 실패", () => {
    expect(failedPaths({ name: "X" })).toContain("functionalUnit");
  });
});
