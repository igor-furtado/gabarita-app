import { render, fireEvent } from "@testing-library/vue";
import { expect, it, vi } from "vitest";
import Button from "../src/components/ui/button/Button.vue";
it("botão acessível aciona a ação pelo clique", async () => {
  const onClick = vi.fn();
  const { getByRole } = render(Button, {
    attrs: { onClick },
    slots: { default: "Salvar" },
  });
  await fireEvent.click(getByRole("button", { name: "Salvar" }));
  expect(onClick).toHaveBeenCalledOnce();
});
