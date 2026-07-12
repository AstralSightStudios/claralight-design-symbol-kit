import { describe, expect, it } from "vitest";

import {
  SYMBOL_IR_SCHEMA_VERSION,
  SymbolWeight,
  createSymbolRenderModel,
  renderSvg,
  type SymbolIr
} from "../index.js";

const symbol: SymbolIr = {
  schemaVersion: SYMBOL_IR_SCHEMA_VERSION,
  name: "Sample",
  viewBox: { x: 0, y: 0, width: 24, height: 24 },
  variants: [
    {
      kind: "duotone",
      weight: SymbolWeight.Regular,
      layers: [
        {
          role: "accent",
          geometry: {
            paths: [
              {
                commands: [
                  { type: "move", point: { x: 4, y: 4 } },
                  { type: "line", point: { x: 20, y: 4 } },
                  { type: "close" }
                ]
              }
            ]
          }
        },
        {
          role: "primary",
          geometry: {
            paths: [
              {
                commands: [
                  { type: "move", point: { x: 2, y: 2 } },
                  { type: "line", point: { x: 22, y: 22 } }
                ]
              }
            ]
          }
        }
      ]
    }
  ]
};

describe("core rendering", () => {
  it("creates a platform-independent render model", () => {
    const model = createSymbolRenderModel(symbol, {
      kind: "duotone",
      weight: SymbolWeight.Regular,
      primaryColor: "#111111",
      accentColor: "#777777",
      accentOpacity: 0.2
    });

    expect(model).toMatchObject({
      name: "Sample",
      fill: "#111111",
      layers: [
        {
          role: "accent",
          fill: "#777777",
          opacity: 0.2,
          paths: [{ d: "M4 4L20 4Z", fillRule: "evenodd" }]
        },
        {
          role: "primary",
          paths: [{ d: "M2 2L22 22", fillRule: "evenodd" }]
        }
      ]
    });
  });

  it("renders canonical SVG from the same model", () => {
    const svg = renderSvg(symbol, {
      kind: "duotone",
      weight: SymbolWeight.Regular,
      accentOpacity: 0.2
    });

    expect(svg).toContain('fill="currentColor"');
    expect(svg).toContain('data-symbol-layer="accent" opacity="0.2"');
    expect(svg).toContain('fill-rule="evenodd"');
  });
});
