import { describe, expect, it } from "vitest";

import {
  SYMBOL_IR_SCHEMA_VERSION,
  SymbolWeight,
  type SymbolGeometry,
  type SymbolIr
} from "../index.js";

const primaryGeometry: SymbolGeometry = {
  paths: [
    {
      commands: [
        { type: "move", point: { x: 2, y: 2 } },
        { type: "line", point: { x: 22, y: 2 } },
        {
          type: "cubic",
          controlPoint1: { x: 22, y: 8 },
          controlPoint2: { x: 8, y: 22 },
          point: { x: 2, y: 22 }
        },
        { type: "close" }
      ]
    }
  ]
};

const accentGeometry: SymbolGeometry = {
  paths: [
    {
      commands: [
        { type: "move", point: { x: 7, y: 7 } },
        { type: "line", point: { x: 17, y: 7 } },
        { type: "line", point: { x: 12, y: 17 } },
        { type: "close" }
      ]
    }
  ]
};

const symbolIr: SymbolIr = {
  schemaVersion: SYMBOL_IR_SCHEMA_VERSION,
  name: "sample-symbol",
  viewBox: { x: 0, y: 0, width: 24, height: 24 },
  variants: [
    {
      kind: "outline",
      weight: SymbolWeight.Regular,
      layers: [{ role: "primary", geometry: primaryGeometry }]
    },
    {
      kind: "fill",
      weight: SymbolWeight.Regular,
      layers: [{ role: "primary", geometry: primaryGeometry }]
    },
    {
      kind: "duotone",
      weight: SymbolWeight.Regular,
      layers: [
        { role: "accent", geometry: accentGeometry },
        { role: "primary", geometry: primaryGeometry }
      ]
    }
  ]
};

describe("Symbol IR", () => {
  it("creates a complete platform-independent symbol", () => {
    expect(symbolIr).toMatchObject({
      schemaVersion: 1,
      name: "sample-symbol",
      viewBox: { x: 0, y: 0, width: 24, height: 24 }
    });
    expect(symbolIr.variants).toHaveLength(3);
  });

  it("expresses an outline variant with primary geometry", () => {
    expect(symbolIr.variants[0]).toEqual({
      kind: "outline",
      weight: SymbolWeight.Regular,
      layers: [{ role: "primary", geometry: primaryGeometry }]
    });
  });

  it("expresses a fill variant with primary geometry", () => {
    expect(symbolIr.variants[1]).toEqual({
      kind: "fill",
      weight: SymbolWeight.Regular,
      layers: [{ role: "primary", geometry: primaryGeometry }]
    });
  });

  it("expresses a duotone variant with semantic layer order", () => {
    expect(symbolIr.variants[2]).toEqual({
      kind: "duotone",
      weight: SymbolWeight.Regular,
      layers: [
        { role: "accent", geometry: accentGeometry },
        { role: "primary", geometry: primaryGeometry }
      ]
    });
  });
});
