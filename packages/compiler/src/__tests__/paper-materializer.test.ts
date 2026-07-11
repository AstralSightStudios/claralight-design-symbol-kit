import { readFileSync } from "node:fs";

import { SymbolWeight } from "@claralight-design/symbol-kit-core";
import { describe, expect, it } from "vitest";

import {
  compileSymbol,
  createPaperGeometryMaterializer,
  generateFigmaSvgSet,
  type CompilerConfigInput
} from "../index.js";

const arrowArcLeftSvg = readFileSync(
  new URL("../../../../test/ArrowArcLeft.svg", import.meta.url),
  "utf8"
);
const arrowUUpRightSvg = readFileSync(
  new URL("../../../../test/ArrowUUpRight.svg", import.meta.url),
  "utf8"
);

const config: CompilerConfigInput = {
  colors: { foreground: ["#000000"] },
  styles: {
    build: {
      color: "#000000",
      reverse: "#FFFFFF",
      lineOpacity: 0.1,
      duotoneLineOpacity: 0.6,
      backgroundOpacity: 0.8,
      noFillBackgroundOpacity: 0.1,
      noDuotoneBackgroundOpacity: 0.9
    },
    normal: {
      color: "#000000",
      reverse: "#000000",
      lineOpacity: 1,
      duotoneLineOpacity: 0,
      backgroundOpacity: 0,
      noFillBackgroundOpacity: 0,
      noDuotoneBackgroundOpacity: 0
    },
    duotone: {
      color: "#000000",
      reverse: "#000000",
      lineOpacity: 0,
      duotoneLineOpacity: 0.7,
      backgroundOpacity: 0.2,
      noFillBackgroundOpacity: 0.3,
      noDuotoneBackgroundOpacity: 0
    },
    fill: {
      color: "#000000",
      reverse: "#FFFFFF",
      lineOpacity: 0,
      duotoneLineOpacity: 0.6,
      backgroundOpacity: 0.8,
      noFillBackgroundOpacity: 0,
      noDuotoneBackgroundOpacity: 0.9
    }
  },
  weights: {
    [SymbolWeight.Ultralight]: { strokeWidth: 0.6 }
  },
  modes: ["outline", "fill", "duotone"]
};

describe("Paper geometry materializer", () => {
  it("matches the generated SVG path structure for outline and fill", () => {
    const result = compileSymbol({
      name: "ArrowArcLeft",
      sources: [
        {
          weight: SymbolWeight.Ultralight,
          fileName: "ArrowArcLeft.svg",
          svg: arrowArcLeftSvg
        }
      ],
      config,
      geometryMaterializer: createPaperGeometryMaterializer({
        sourceStrokeWidth: 0.6,
        weights: config.weights ?? {}
      })
    });
    const generated = generateFigmaSvgSet({
      name: "ArrowArcLeft",
      svg: arrowArcLeftSvg,
      config
    });
    const outline = result.symbol?.variants.find((variant) => variant.kind === "outline");
    const fill = result.symbol?.variants.find((variant) => variant.kind === "fill");
    const generatedOutline = generated.files.find((file) => file.style === "normal");
    const generatedFill = generated.files.find((file) => file.style === "fill");

    expect(result.diagnostics).toEqual([]);
    expect(outline?.layers[0].geometry.paths).toHaveLength(countPaths(generatedOutline?.svg));
    expect(fill?.layers[0].geometry.paths).toHaveLength(countPaths(generatedFill?.svg));
    expect(
      outline?.layers[0].geometry.paths.every(
        (path) => path.commands.at(-1)?.type === "close"
      )
    ).toBe(true);
  });

  it("preserves accent geometry and excludes build-only lines from duotone", () => {
    const result = compileSymbol({
      name: "ArrowUUpRight",
      sources: [
        {
          weight: SymbolWeight.Ultralight,
          fileName: "ArrowUUpRight.svg",
          svg: arrowUUpRightSvg
        }
      ],
      config,
      geometryMaterializer: createPaperGeometryMaterializer({
        sourceStrokeWidth: 0.6,
        weights: config.weights ?? {}
      })
    });
    const generated = generateFigmaSvgSet({
      name: "ArrowUUpRight",
      svg: arrowUUpRightSvg,
      config
    });
    const duotone = result.symbol?.variants.find((variant) => variant.kind === "duotone");
    const accent = duotone?.layers.find((layer) => layer.role === "accent");
    const primary = duotone?.layers.find((layer) => layer.role === "primary");
    const generatedDuotone = generated.files.find((file) => file.style === "duotone");

    expect(result.diagnostics).toEqual([]);
    expect(accent?.geometry.paths).toHaveLength(1);
    expect(primary?.geometry.paths).toHaveLength(3);
    expect(generatedDuotone?.svg).not.toContain('d=""');
  });
});

function countPaths(svg: string | undefined): number {
  return svg?.match(/<path\b/gu)?.length ?? 0;
}
