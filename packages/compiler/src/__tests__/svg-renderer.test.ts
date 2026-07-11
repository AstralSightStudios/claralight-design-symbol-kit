import { readFileSync } from "node:fs";

import {
  SYMBOL_IR_SCHEMA_VERSION,
  SymbolWeight,
  type SymbolIr,
  type SymbolLayer
} from "@claralight-design/symbol-kit-core";
import { describe, expect, it } from "vitest";

import { renderSvg } from "../index.js";

const primaryLayer: SymbolLayer = {
  role: "primary",
  geometry: {
    paths: [
      {
        commands: [
          { type: "move", point: { x: 2, y: 2 } },
          { type: "line", point: { x: 22, y: 2 } },
          {
            type: "cubic",
            controlPoint1: { x: 22, y: 10 },
            controlPoint2: { x: 14, y: 22 },
            point: { x: 2, y: 22 }
          },
          { type: "close" }
        ]
      }
    ]
  }
};

const accentLayer: SymbolLayer = {
  role: "accent",
  geometry: {
    paths: [
      {
        commands: [
          { type: "move", point: { x: 6, y: 6 } },
          { type: "line", point: { x: 18, y: 6 } },
          { type: "line", point: { x: 18, y: 18 } },
          { type: "close" }
        ]
      }
    ]
  }
};

const symbol: SymbolIr = {
  schemaVersion: SYMBOL_IR_SCHEMA_VERSION,
  name: "renderer-symbol",
  viewBox: { x: 0, y: 0, width: 24, height: 24 },
  variants: [
    {
      kind: "outline",
      weight: SymbolWeight.Regular,
      layers: [primaryLayer]
    },
    {
      kind: "fill",
      weight: SymbolWeight.Bold,
      layers: [primaryLayer]
    },
    {
      kind: "duotone",
      weight: SymbolWeight.Regular,
      layers: [accentLayer, primaryLayer]
    }
  ]
};

describe("renderSvg", () => {
  it("renders an outline variant and serializes every path command", () => {
    expect(
      renderSvg(symbol, {
        kind: "outline",
        weight: SymbolWeight.Regular
      })
    ).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><g data-symbol-layer="primary"><path d="M2 2L22 2C22 10 14 22 2 22Z"/></g></svg>'
    );
  });

  it("selects and renders a fill variant by weight", () => {
    const svg = renderSvg(symbol, {
      kind: "fill",
      weight: SymbolWeight.Bold
    });

    expect(svg).toContain('data-symbol-layer="primary"');
    expect(svg).not.toContain('data-symbol-layer="accent"');
  });

  it("renders duotone accent and primary layers in IR order", () => {
    const svg = renderSvg(symbol, {
      kind: "duotone",
      weight: SymbolWeight.Regular
    });

    expect(svg).toContain('<g data-symbol-layer="accent"><path d="M6 6L18 6L18 18Z"/></g>');
    expect(svg.indexOf('data-symbol-layer="accent"')).toBeLessThan(
      svg.indexOf('data-symbol-layer="primary"')
    );
  });

  it("injects primary and accent colors through renderer options", () => {
    const svg = renderSvg(symbol, {
      kind: "duotone",
      weight: SymbolWeight.Regular,
      primaryColor: "#1972F8",
      accentColor: "#7C9ED9",
      accentOpacity: 0.2
    });

    expect(svg).toContain('fill="#1972F8"');
    expect(svg).toContain('data-symbol-layer="accent" fill="#7C9ED9" opacity="0.2"');
    expect(svg).toContain('<g data-symbol-layer="primary">');
  });

  it("rejects invalid accent opacity", () => {
    expect(() =>
      renderSvg(symbol, {
        kind: "duotone",
        weight: SymbolWeight.Regular,
        accentOpacity: 1.1
      })
    ).toThrow("SVG accent opacity must be between 0 and 1: 1.1.");
  });

  it("fails explicitly when the requested variant does not exist", () => {
    expect(() =>
      renderSvg(symbol, {
        kind: "outline",
        weight: SymbolWeight.Black
      })
    ).toThrow("Symbol variant not found: outline:black");
  });

  it("does not mutate Symbol IR", () => {
    const before = JSON.stringify(symbol);

    renderSvg(symbol, {
      kind: "duotone",
      weight: SymbolWeight.Regular
    });

    expect(JSON.stringify(symbol)).toBe(before);
  });
});

describe("SVG renderer boundary", () => {
  it("depends only on Symbol IR and no framework renderer", () => {
    const source = readFileSync(new URL("../renderers/svg/index.ts", import.meta.url), "utf8");

    expect(source).not.toContain("/ast/");
    expect(source).not.toContain("/rendering/");
    expect(source).not.toContain("react");
    expect(source).not.toContain("vue");
    expect(source).not.toContain("flutter");
    expect(source).not.toContain("figma");
  });
});
