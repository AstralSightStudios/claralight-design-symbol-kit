import { readFileSync } from "node:fs";

import { SymbolWeight, type SymbolIr } from "@claralight-design/symbol-kit-core";
import { describe, expect, it } from "vitest";

import {
  compileSymbol,
  parsePathData,
  type GeometryMaterializationInput,
  type GeometryMaterializer,
  type GeometryRegion,
  type SourceSvgAst
} from "../index.js";

interface PackageManifest {
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly devDependencies?: Readonly<Record<string, string>>;
  readonly peerDependencies?: Readonly<Record<string, string>>;
}

function createSourceAst(): SourceSvgAst {
  return {
    name: "pipeline-symbol",
    viewBox: { x: 0, y: 0, width: 24, height: 24 },
    paths: [
      {
        id: "primary",
        d: "M2 2H22V22H2Z",
        path: parsePathData("M2 2H22V22H2Z"),
        paint: { fill: "#000000", opacity: 1 },
        paintOrder: 0
      },
      {
        id: "secondary",
        d: "M6 6H18V18H6Z",
        path: parsePathData("M6 6H18V18H6Z"),
        paint: { fill: "#000000", opacity: 0.4 },
        paintOrder: 1
      }
    ]
  };
}

function createRegion(offset: number): GeometryRegion {
  return {
    paths: [
      {
        commands: [
          { type: "move", point: { x: offset, y: offset } },
          { type: "line", point: { x: 24 - offset, y: offset } },
          { type: "line", point: { x: 24 - offset, y: 24 - offset } },
          { type: "close" }
        ]
      }
    ]
  };
}

function createGeometryMaterializer(
  calls: GeometryMaterializationInput[] = []
): GeometryMaterializer {
  return {
    materialize(input) {
      calls.push(input);

      const primary = createRegion(2);
      const hasAccent = input.rendering.layers.some((layer) => layer.kind === "accent");

      return hasAccent ? { primary, accent: createRegion(6) } : { primary };
    }
  };
}

function requireSymbol(symbol: SymbolIr | undefined): SymbolIr {
  expect(symbol).toBeDefined();
  if (symbol === undefined) {
    throw new Error("Expected compilation to produce Symbol IR.");
  }

  return symbol;
}

describe("compileSymbol", () => {
  it("compiles a Source AST through all stages into Symbol IR", () => {
    const calls: GeometryMaterializationInput[] = [];
    const result = compileSymbol({
      name: "pipeline-symbol",
      config: { modes: ["outline", "fill", "duotone"] },
      sources: [
        {
          weight: SymbolWeight.Regular,
          source: createSourceAst()
        }
      ],
      geometryMaterializer: createGeometryMaterializer(calls)
    });

    expect(result.diagnostics).toEqual([]);
    const symbol = requireSymbol(result.symbol);

    expect(symbol).toMatchObject({
      schemaVersion: 1,
      name: "pipeline-symbol",
      viewBox: { x: 0, y: 0, width: 24, height: 24 }
    });
    expect(symbol.variants.map((variant) => variant.kind)).toEqual(["outline", "fill", "duotone"]);
    expect(calls.map((call) => call.rendering.layers.map((layer) => layer.kind))).toEqual([
      ["primary"],
      ["foreground"],
      ["accent", "primary"]
    ]);
    expect(calls.map((call) => call.lowered.paths.map((path) => path.sourcePathIndex))).toEqual([
      [0],
      [0, 1],
      [1, 0]
    ]);
    expect(calls[0]?.lowered.paths[0]?.geometry.commands).toEqual([
      { type: "move", point: { x: 2, y: 2 } },
      { type: "line", point: { x: 22, y: 2 } },
      { type: "line", point: { x: 22, y: 22 } },
      { type: "line", point: { x: 2, y: 22 } },
      { type: "close" }
    ]);
  });

  it("emits the required layers for outline, fill, and duotone variants", () => {
    const result = compileSymbol({
      name: "pipeline-symbol",
      config: { modes: ["outline", "fill", "duotone"] },
      sources: [
        {
          weight: SymbolWeight.Regular,
          source: createSourceAst()
        }
      ],
      geometryMaterializer: createGeometryMaterializer()
    });

    const symbol = requireSymbol(result.symbol);

    expect(symbol.variants[0]?.layers.map((layer) => layer.role)).toEqual(["primary"]);
    expect(symbol.variants[1]?.layers.map((layer) => layer.role)).toEqual(["primary"]);
    expect(symbol.variants[2]?.layers.map((layer) => layer.role)).toEqual(["accent", "primary"]);
  });

  it("fails explicitly when geometry materialization is not injected", () => {
    expect(() =>
      compileSymbol({
        name: "pipeline-symbol",
        sources: [
          {
            weight: SymbolWeight.Regular,
            source: createSourceAst()
          }
        ]
      })
    ).toThrow("Geometry materializer is required because no geometry backend is implemented.");
  });

  it("compiles outline by default through the raw SVG parser boundary", () => {
    const result = compileSymbol({
      name: "pipeline-symbol",
      sources: [
        {
          weight: SymbolWeight.Regular,
          fileName: "pipeline-symbol.svg",
          svg: '<svg viewBox="0 0 24 24"><path d="M2 2H22V22H2Z" /></svg>'
        }
      ],
      geometryMaterializer: createGeometryMaterializer()
    });

    expect(requireSymbol(result.symbol).variants.map((variant) => variant.kind)).toEqual([
      "outline"
    ]);
  });
});

describe("compiler pipeline boundary", () => {
  it("does not depend on exporters or framework renderers", () => {
    const packageManifest = JSON.parse(
      readFileSync(new URL("../../package.json", import.meta.url), "utf8")
    ) as PackageManifest;
    const pipelineSource = readFileSync(new URL("../pipeline.ts", import.meta.url), "utf8");
    const declaredPackages = {
      ...packageManifest.dependencies,
      ...packageManifest.devDependencies,
      ...packageManifest.peerDependencies
    };

    expect(declaredPackages).not.toHaveProperty("@claralight-design/symbol-kit-react");
    expect(declaredPackages).not.toHaveProperty("react");
    expect(declaredPackages).not.toHaveProperty("vue");
    expect(declaredPackages).not.toHaveProperty("flutter");
    expect(declaredPackages).not.toHaveProperty("figma");
    expect(pipelineSource).not.toContain('from "./exporter/');
  });
});
