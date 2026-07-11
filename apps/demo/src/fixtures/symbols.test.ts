import { renderSvg } from "@claralight-design/symbol-kit-compiler";
import { SymbolWeight } from "@claralight-design/symbol-kit-core";
import { describe, expect, it } from "vitest";

import { demoAccentOpacity, demoDiagnostics, demoSymbols } from "./symbols.js";

describe("demo symbol fixtures", () => {
  it("compiles every real Figma SVG into Symbol IR", () => {
    expect(demoDiagnostics).toEqual([]);
    expect(demoSymbols).toHaveLength(81);
    expect(demoSymbols).toContainEqual(expect.objectContaining({ name: "CreditCard" }));
    expect(
      demoSymbols.every(
        (symbol) =>
          symbol.variants.length === 3 &&
          symbol.variants.every((variant) => variant.layers.length > 0)
      )
    ).toBe(true);
  });

  it("renders every compiled symbol as SVG", () => {
    for (const symbol of demoSymbols) {
      const svg = renderSvg(symbol, {
        kind: "duotone",
        weight: SymbolWeight.Ultralight,
        primaryColor: "#1972F8",
        accentColor: "#7C9ED9",
        accentOpacity: demoAccentOpacity
      });

      expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
      expect(svg).toContain("<path");
    }
  });

  it("keeps the ArrowUUpRight duotone accent and removes its build-only line", () => {
    const symbol = demoSymbols.find((candidate) => candidate.name === "ArrowUUpRight");
    const duotone = symbol?.variants.find((variant) => variant.kind === "duotone");
    const accent = duotone?.layers.find((layer) => layer.role === "accent");
    const primary = duotone?.layers.find((layer) => layer.role === "primary");
    const svg =
      symbol === undefined
        ? ""
        : renderSvg(symbol, {
            kind: "duotone",
            weight: SymbolWeight.Ultralight,
            primaryColor: "#1972F8",
            accentColor: "#7C9ED9",
            accentOpacity: demoAccentOpacity
          });

    expect(accent?.geometry.paths).toHaveLength(1);
    expect(primary?.geometry.paths).toHaveLength(3);
    expect(svg).toContain('data-symbol-layer="accent" fill="#7C9ED9" opacity="0.2"');
  });

  it("subtracts ArrowCircleRight reverse paths from the fill foreground", () => {
    const symbol = demoSymbols.find((candidate) => candidate.name === "ArrowCircleRight");
    const svg =
      symbol === undefined
        ? ""
        : renderSvg(symbol, {
            kind: "fill",
            weight: SymbolWeight.Ultralight,
            primaryColor: "#1972F8"
          });

    expect(svg.match(/M/gu)?.length).toBeGreaterThan(1);
  });
});
