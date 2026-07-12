import { renderSvg } from "@claralight-design/symbol-kit-compiler";
import { SymbolWeight } from "@claralight-design/symbol-kit-core";
import { describe, expect, it } from "vitest";

import {
  demoAccentOpacity,
  demoDiagnostics,
  demoFixtureCount,
  demoSymbols,
  demoWeights
} from "./symbols.js";

const VARIANT_KINDS = ["outline", "fill", "duotone"] as const;

describe("demo symbol fixtures", () => {
  it("compiles every real Figma SVG into Symbol IR", () => {
    expect(demoDiagnostics).toEqual([]);
    expect(demoSymbols).toHaveLength(demoFixtureCount);
    expect(demoSymbols).toContainEqual(expect.objectContaining({ name: "CreditCard" }));
    expect(
      demoSymbols.every(
        (symbol) =>
          symbol.variants.length === demoWeights.length * VARIANT_KINDS.length &&
          demoWeights.every((weight) =>
            VARIANT_KINDS.every((kind) =>
              symbol.variants.some(
                (variant) =>
                  variant.kind === kind && variant.weight === weight && variant.layers.length > 0
              )
            )
          )
      )
    ).toBe(true);
  });

  it("renders every compiled symbol at every configured weight", () => {
    for (const symbol of demoSymbols) {
      for (const weight of demoWeights) {
        const svg = renderSvg(symbol, {
          kind: "duotone",
          weight,
          primaryColor: "#1972F8",
          accentColor: "#7C9ED9",
          accentOpacity: demoAccentOpacity
        });

        expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
        expect(svg).toContain("<path");
      }
    }
  });

  it("materializes different geometry for different weights", () => {
    const symbol = demoSymbols.find((candidate) => candidate.name === "CreditCard");
    const renderOutline = (weight: SymbolWeight) =>
      symbol === undefined
        ? ""
        : renderSvg(symbol, {
            kind: "outline",
            weight,
            primaryColor: "#1972F8"
          });

    expect(new Set(demoWeights.map(renderOutline)).size).toBe(demoWeights.length);
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

  it.each([
    ["AstroBoxLogo", 4],
    ["CreatorConsoleLogo", 2]
  ] as const)(
    "keeps fill-only reverse geometry out of %s outline and duotone variants",
    (name, primaryPathCount) => {
      const symbol = demoSymbols.find((candidate) => candidate.name === name);
      const outline = symbol?.variants.find(
        (variant) =>
          variant.kind === "outline" && variant.weight === SymbolWeight.Ultralight
      );
      const duotone = symbol?.variants.find(
        (variant) =>
          variant.kind === "duotone" && variant.weight === SymbolWeight.Ultralight
      );
      const outlinePrimary = outline?.layers.find((layer) => layer.role === "primary");
      const duotonePrimary = duotone?.layers.find((layer) => layer.role === "primary");
      const duotoneAccent = duotone?.layers.find((layer) => layer.role === "accent");

      expect(outlinePrimary?.geometry.paths).toHaveLength(primaryPathCount);
      expect(duotonePrimary?.geometry.paths).toHaveLength(primaryPathCount);
      expect(duotoneAccent?.geometry.paths).toHaveLength(2);
    }
  );

  it("keeps reverse strokes in ArrowCircleRight outline and duotone variants", () => {
    const symbol = demoSymbols.find((candidate) => candidate.name === "ArrowCircleRight");
    const outline = symbol?.variants.find(
      (variant) =>
        variant.kind === "outline" && variant.weight === SymbolWeight.Ultralight
    );
    const duotone = symbol?.variants.find(
      (variant) =>
        variant.kind === "duotone" && variant.weight === SymbolWeight.Ultralight
    );
    const outlinePrimary = outline?.layers.find((layer) => layer.role === "primary");
    const duotonePrimary = duotone?.layers.find((layer) => layer.role === "primary");
    const duotoneAccent = duotone?.layers.find((layer) => layer.role === "accent");

    expect(outlinePrimary?.geometry.paths).toHaveLength(3);
    expect(duotonePrimary?.geometry.paths).toHaveLength(3);
    expect(duotoneAccent?.geometry.paths).toHaveLength(1);
  });
});
