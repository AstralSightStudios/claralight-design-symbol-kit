import { readFileSync } from "node:fs";

import { SymbolWeight } from "@claralight-design/symbol-kit-core";
import { describe, expect, it } from "vitest";

import {
  classifySourceSvgAstWithDiagnostics,
  compileDuotone,
  compileSymbol,
  inferSymbolWeight,
  parseSvgSource,
  resolveCompilerConfig
} from "../index.js";

interface StyleTokenFixture {
  readonly Fill: {
    readonly Color: {
      readonly $value: {
        readonly hex: string;
      };
    };
  };
}

interface WeightTokenFixture {
  readonly Width: {
    readonly "Stroke Width": {
      readonly $value: number;
    };
  };
}

const creditCardSvg = readFileSync(
  new URL("../../../../test/CreditCard.svg", import.meta.url),
  "utf8"
);
const duotoneTokens = JSON.parse(
  readFileSync(new URL("../../../../test/Style/Duotone.tokens.json", import.meta.url), "utf8")
) as StyleTokenFixture;
const ultraLightTokens = JSON.parse(
  readFileSync(new URL("../../../../test/Width/UltraLight.tokens.json", import.meta.url), "utf8")
) as WeightTokenFixture;

function createProductionConfig() {
  return resolveCompilerConfig({
    project: {
      colors: {
        foreground: [duotoneTokens.Fill.Color.$value.hex]
      },
      styles: {
        normal: {
          color: "#000000",
          reverse: "#000000",
          lineOpacity: 1,
          duotoneLineOpacity: 0,
          noFillLineOpacity: 1,
          noDuotoneLineOpacity: 1,
          onlyFillLineOpacity: 0,
          onlyDuotoneLineOpacity: 0,
          backgroundOpacity: 0,
          noFillBackgroundOpacity: 0,
          noDuotoneBackgroundOpacity: 0
        },
        duotone: {
          color: "#000000",
          reverse: "#000000",
          lineOpacity: 0,
          duotoneLineOpacity: 0.7,
          noFillLineOpacity: 1,
          noDuotoneLineOpacity: 0,
          onlyFillLineOpacity: 0,
          onlyDuotoneLineOpacity: 1,
          backgroundOpacity: 0.2,
          noFillBackgroundOpacity: 0.3,
          noDuotoneBackgroundOpacity: 0
        },
        fill: {
          color: "#000000",
          reverse: "#FFFFFF",
          lineOpacity: 0,
          duotoneLineOpacity: 0.6,
          noFillLineOpacity: 0,
          noDuotoneLineOpacity: 1,
          onlyFillLineOpacity: 1,
          onlyDuotoneLineOpacity: 0,
          backgroundOpacity: 0.8,
          noFillBackgroundOpacity: 0,
          noDuotoneBackgroundOpacity: 0.9
        }
      },
      weights: {
        ultralight: {
          strokeWidth: ultraLightTokens.Width["Stroke Width"].$value
        }
      },
      modes: ["outline", "fill", "duotone"]
    }
  });
}

describe("production semantic rules", () => {
  it("classifies the real CreditCard fixture into accent and primary layers", () => {
    const source = parseSvgSource({ name: "CreditCard", svg: creditCardSvg });
    const config = createProductionConfig();
    const result = classifySourceSvgAstWithDiagnostics(source, config);
    const rendering = compileDuotone(result.semantic, config);

    expect(result.diagnostics).toEqual([]);
    expect(result.semantic.paths.map((path) => path.role)).toEqual([
      "accent",
      "primary",
      "primary",
      "primary"
    ]);
    expect(rendering.layers.map((layer) => layer.kind)).toEqual(["accent", "primary"]);
    expect(rendering.layers[0]?.paths.map((path) => path.sourcePathIndex)).toEqual([0]);
    expect(rendering.layers[1]?.paths.map((path) => path.sourcePathIndex)).toEqual([1, 2, 3]);
  });

  it("infers UltraLight from the real fixture stroke width and width token", () => {
    const source = parseSvgSource({ name: "CreditCard", svg: creditCardSvg });
    const result = inferSymbolWeight(source, createProductionConfig());

    expect(result).toEqual({
      weight: SymbolWeight.Ultralight,
      diagnostics: []
    });
  });

  it("compiles the real fixture with an inferred weight through the pipeline", () => {
    const result = compileSymbol({
      name: "CreditCard",
      sources: [{ fileName: "CreditCard.svg", svg: creditCardSvg }],
      config: createProductionConfig(),
      geometryMaterializer: {
        materialize({ rendering }) {
          const primary = { paths: [] };
          return rendering.layers.some((layer) => layer.kind === "accent")
            ? { primary, accent: { paths: [] } }
            : { primary };
        }
      }
    });

    expect(result.diagnostics).toEqual([]);
    expect(
      result.symbol?.variants.every((variant) => variant.weight === SymbolWeight.Ultralight)
    ).toBe(true);
    expect(result.symbol?.variants.find((variant) => variant.kind === "duotone")?.layers).toEqual([
      expect.objectContaining({ role: "accent" }),
      expect.objectContaining({ role: "primary" })
    ]);
  });

  it("uses config, SVG, and defaults in order for stroke styles", () => {
    const source = parseSvgSource({ name: "CreditCard", svg: creditCardSvg });
    const baseConfig = createProductionConfig();
    const svgResult = classifySourceSvgAstWithDiagnostics(source, baseConfig);
    const configuredResult = classifySourceSvgAstWithDiagnostics(
      source,
      resolveCompilerConfig({
        global: baseConfig,
        project: {
          stroke: {
            strokeLinecap: "square",
            strokeLinejoin: "bevel"
          }
        }
      })
    );

    expect(svgResult.semantic.paths[2]?.paint).toMatchObject({
      strokeLinecap: "round",
      strokeLinejoin: "round"
    });
    expect(svgResult.semantic.paths[3]?.paint).toMatchObject({
      strokeLinecap: "round",
      strokeLinejoin: "miter"
    });
    expect(configuredResult.semantic.paths[2]?.paint).toMatchObject({
      strokeLinecap: "square",
      strokeLinejoin: "bevel"
    });
  });

  it.each([
    [0.2, "accent"],
    [0.3, "background-no-fill"],
    [0.8, "accent"],
    [0.9, "background-no-duotone"]
  ] as const)("classifies configured background opacity %s as %s", (opacity, role) => {
    const source = parseSvgSource({
      name: "CreditCard",
      svg: creditCardSvg.replace('opacity="0.2"', `opacity="${String(opacity)}"`)
    });
    const result = classifySourceSvgAstWithDiagnostics(source, createProductionConfig());

    expect(result.semantic.paths[0]?.role).toBe(role);
    expect(result.diagnostics).toEqual([]);
  });

  it.each([0.6, 0.7, 1])("classifies configured line opacity %s as primary", (opacity) => {
    const source = parseSvgSource({
      name: "CreditCard",
      svg: creditCardSvg.replace(
        'stroke="black" stroke-width="0.6"',
        `stroke="black" stroke-width="0.6" opacity="${String(opacity)}"`
      )
    });
    const result = classifySourceSvgAstWithDiagnostics(source, createProductionConfig());

    expect(result.semantic.paths[2]?.role).toBe("primary");
    expect(result.diagnostics).toEqual([]);
  });

  it("diagnoses opacity outside every configured tier", () => {
    const source = parseSvgSource({
      name: "CreditCard",
      svg: creditCardSvg.replace('opacity="0.2"', 'opacity="0.4"')
    });
    const result = classifySourceSvgAstWithDiagnostics(source, createProductionConfig());

    expect(result.semantic.paths[0]?.role).toBe("unknown");
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "semantic.opacity-mismatch", severity: "error" })
    );
  });

  it("diagnoses invalid color without classifying it as primary or accent", () => {
    const source = parseSvgSource({
      name: "CreditCard",
      svg: creditCardSvg.replace('fill="black"', 'fill="#00ff00"')
    });
    const result = classifySourceSvgAstWithDiagnostics(source, createProductionConfig());

    expect(result.semantic.paths[0]?.role).toBe("unknown");
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "semantic.paint-color-mismatch", severity: "error" })
    );
  });

  it("returns a diagnostic when stroke width does not match a weight profile", () => {
    const source = parseSvgSource({
      name: "CreditCard",
      svg: creditCardSvg.replaceAll('stroke-width="0.6"', 'stroke-width="0.7"')
    });
    const result = inferSymbolWeight(source, createProductionConfig());

    expect(result.weight).toBeUndefined();
    expect(result.diagnostics).toEqual([
      expect.objectContaining({ code: "weight.unmatched-stroke-width", severity: "error" })
    ]);
  });
});
