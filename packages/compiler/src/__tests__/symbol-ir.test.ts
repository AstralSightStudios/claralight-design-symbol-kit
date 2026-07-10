import { describe, expect, it } from "vitest";

import { SymbolWeight, type SymbolIr } from "@claralight-design/symbol-kit-core";

import {
  compileDuotone,
  compileFill,
  compileOutline,
  createSymbolIr,
  resolveCompilerConfig,
  type GeometryRegion,
  type SemanticRole,
  type SemanticSvgAst
} from "../index.js";

function createSemanticAst(roles: readonly SemanticRole[]): SemanticSvgAst {
  return {
    name: "sample-symbol",
    viewBox: { x: 0, y: 0, width: 24, height: 24 },
    paths: roles.map((role, index) => ({
      id: `path-${String(index)}`,
      d: `M${String(index)} ${String(index)}H24V24H${String(index)}Z`,
      paint: {
        fill: "#000000",
        opacity: role === "accent" ? 0.4 : 1
      },
      role,
      paintOrder: index
    }))
  };
}

function createRegion(offset: number): GeometryRegion {
  return {
    paths: [
      {
        commands: [
          { type: "move", point: { x: offset, y: offset } },
          { type: "line", point: { x: 24 - offset, y: offset } },
          {
            type: "cubic",
            controlPoint1: { x: 24 - offset, y: 12 },
            controlPoint2: { x: 12, y: 24 - offset },
            point: { x: offset, y: 24 - offset }
          },
          { type: "close" }
        ]
      }
    ]
  };
}

describe("Rendering AST to Symbol IR", () => {
  it("converts outline, fill, and duotone rendering results", () => {
    const semantic = createSemanticAst(["primary", "accent"]);
    const config = resolveCompilerConfig();
    const primary = createRegion(2);
    const accent = createRegion(6);

    const ir: SymbolIr = createSymbolIr({
      name: semantic.name,
      variants: [
        {
          weight: SymbolWeight.Regular,
          rendering: compileOutline(semantic, config),
          geometry: { primary }
        },
        {
          weight: SymbolWeight.Regular,
          rendering: compileFill(semantic, config),
          geometry: { primary }
        },
        {
          weight: SymbolWeight.Regular,
          rendering: compileDuotone(semantic, config),
          geometry: { primary, accent }
        }
      ]
    });

    expect(ir).toMatchObject({
      schemaVersion: 1,
      name: "sample-symbol",
      viewBox: { x: 0, y: 0, width: 24, height: 24 }
    });
    expect(ir.variants.map((variant) => variant.kind)).toEqual(["outline", "fill", "duotone"]);
    expect(ir.variants[0]?.layers.map((layer) => layer.role)).toEqual(["primary"]);
    expect(ir.variants[1]?.layers.map((layer) => layer.role)).toEqual(["primary"]);
    expect(ir.variants[2]?.layers.map((layer) => layer.role)).toEqual(["accent", "primary"]);
    expect(ir.variants[2]?.layers[0]?.geometry.paths[0]?.commands[0]).toEqual({
      type: "move",
      point: { x: 6, y: 6 }
    });
  });

  it("keeps a duotone accent layer absent when the Rendering AST has none", () => {
    const semantic = createSemanticAst(["primary"]);

    const ir = createSymbolIr({
      name: semantic.name,
      variants: [
        {
          weight: SymbolWeight.Bold,
          rendering: compileDuotone(semantic, resolveCompilerConfig()),
          geometry: { primary: createRegion(2) }
        }
      ]
    });

    expect(ir.variants[0]?.layers.map((layer) => layer.role)).toEqual(["primary"]);
  });

  it("rejects duplicate mode and weight variants", () => {
    const semantic = createSemanticAst(["primary"]);
    const rendering = compileOutline(semantic, resolveCompilerConfig());
    const variant = {
      weight: SymbolWeight.Regular,
      rendering,
      geometry: { primary: createRegion(2) }
    };

    expect(() =>
      createSymbolIr({
        name: semantic.name,
        variants: [variant, variant]
      })
    ).toThrow("Duplicate Symbol IR variant: outline:regular");
  });
});
