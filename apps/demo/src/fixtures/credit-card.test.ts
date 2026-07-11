import { renderSvg } from "@claralight-design/symbol-kit-compiler";
import { SymbolWeight } from "@claralight-design/symbol-kit-core";
import { describe, expect, it } from "vitest";

import { creditCardDiagnostics, creditCardSymbol } from "./credit-card.js";

describe("CreditCard demo fixture", () => {
  it("compiles the real Figma SVG into Symbol IR", () => {
    expect(creditCardDiagnostics).toEqual([]);
    expect(creditCardSymbol.name).toBe("CreditCard");
    expect(creditCardSymbol.viewBox).toEqual({ x: 0, y: 0, width: 32, height: 32 });
    expect(creditCardSymbol.variants.map((variant) => variant.kind)).toEqual([
      "outline",
      "fill",
      "duotone"
    ]);
    expect(creditCardSymbol.variants.every((variant) => variant.layers.length > 0)).toBe(true);
  });

  it("renders every compiled variant as SVG", () => {
    for (const kind of ["outline", "fill", "duotone"] as const) {
      const svg = renderSvg(creditCardSymbol, {
        kind,
        weight: SymbolWeight.Ultralight,
        primaryColor: "#1972F8",
        accentColor: "#7C9ED9"
      });

      expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
      expect(svg).toContain("<path");
    }
  });
});
