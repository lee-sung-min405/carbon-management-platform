import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ProductForm } from "./ProductForm";

vi.mock("@/lib/api/mutations", () => ({
  createProduct: vi.fn(),
}));

describe("ProductForm", () => {
  it("유효한 입력 제출 시 Invalid input 검증 오류가 없다", async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <ProductForm open onOpenChange={onOpenChange} onCreated={onCreated} />,
    );

    await user.clear(screen.getByLabelText("제품명"));
    await user.type(screen.getByLabelText("제품명"), "컴퓨터 화면 2");
    await user.type(screen.getByLabelText("SKU"), "CR-046");
    await user.type(screen.getByLabelText("설명"), "제품 테스트");

    await user.click(screen.getByRole("button", { name: "제품 생성" }));

    await waitFor(() => {
      expect(screen.queryByText(/Invalid input/i)).toBeNull();
    });
  });
});
