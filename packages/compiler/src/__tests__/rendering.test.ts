import { describe, expect, it } from "vitest";

import {
  compileDuotone,
  compileFill,
  compileOutline,
  parsePathData,
  resolveCompilerConfig,
  type SemanticRole,
  type SemanticSvgAst
} from "../index.js";

function createSemanticAst(roles: readonly SemanticRole[]): SemanticSvgAst {
  return {
    name: "test-symbol",
    viewBox: {
      x: 0,
      y: 0,
      width: 24,
      height: 24
    },
    paths: roles.map((role, index) => {
      const d = `M${String(index)} ${String(index)}H24V24H${String(index)}Z`;
      return {
        id: `path-${String(index)}`,
        d,
        path: parsePathData(d),
        paint: {
          fill: "#000000",
          opacity: role === "secondary" ? 0.4 : 1
        },
        paintOrder: index,
        role
      };
    })
  };
}

function getLayerPathIndexes(
  ast: SemanticSvgAst,
  roles: readonly SemanticRole[]
): readonly number[] {
  return ast.paths
    .map((path, index) => (roles.includes(path.role) ? index : undefined))
    .filter((index): index is number => index !== undefined);
}

describe("rendering compiler", () => {
  it("compiles outline by keeping primary paths and dropping accent and secondary paths", () => {
    const semantic = createSemanticAst(["primary", "accent", "secondary", "cutout"]);
    const rendering = compileOutline(semantic, resolveCompilerConfig());

    expect(rendering.kind).toBe("outline");
    expect(rendering.cutoutHandling).toBe("drop");
    expect(rendering.layers).toHaveLength(1);
    expect(rendering.layers[0]).toMatchObject({
      kind: "primary",
      zIndex: 1
    });
    expect(rendering.layers[0]?.paths.map((path) => path.sourcePathIndex)).toEqual([0]);
  });

  it("compiles outline cutouts according to the outline config", () => {
    const semantic = createSemanticAst(["primary", "cutout", "accent"]);
    const config = resolveCompilerConfig({
      cli: {
        outline: {
          foreground: "convert-to-background"
        }
      }
    });
    const rendering = compileOutline(semantic, config);

    expect(rendering.cutoutHandling).toBe("convert-to-background");
    expect(rendering.layers.map((layer) => layer.kind)).toEqual(["background", "primary"]);
    expect(rendering.layers[0]?.paths.map((path) => path.sourcePathIndex)).toEqual([1]);
    expect(rendering.layers[1]?.paths.map((path) => path.sourcePathIndex)).toEqual([0]);
  });

  it("compiles duotone with accent below primary without geometry changes", () => {
    const semantic = createSemanticAst(["primary", "accent", "secondary", "cutout"]);
    const rendering = compileDuotone(semantic, resolveCompilerConfig());

    expect(rendering.layers.map((layer) => [layer.kind, layer.zIndex])).toEqual([
      ["accent", 0],
      ["primary", 1]
    ]);
    expect(rendering.layers[0]?.paths.map((path) => path.sourcePathIndex)).toEqual([1, 2]);
    expect(rendering.layers[1]?.paths.map((path) => path.sourcePathIndex)).toEqual([0]);
    expect(rendering.layers[0]?.paths.map((path) => path.d)).toEqual([
      semantic.paths[1]?.d,
      semantic.paths[2]?.d
    ]);
  });

  it("compiles fill into foreground and background groups with a boolean operation plan", () => {
    const semantic = createSemanticAst(["primary", "accent", "secondary", "cutout", "unknown"]);
    const rendering = compileFill(semantic, resolveCompilerConfig());

    expect(rendering.layers.map((layer) => layer.kind)).toEqual(["foreground", "background"]);
    expect(rendering.layers[0]?.paths.map((path) => path.sourcePathIndex)).toEqual(
      getLayerPathIndexes(semantic, ["primary", "accent", "secondary"])
    );
    expect(rendering.layers[1]?.paths.map((path) => path.sourcePathIndex)).toEqual([3]);
    expect(rendering.geometryRequests).toEqual([
      {
        type: "union",
        target: "foreground",
        inputPathIndexes: [0, 1, 2]
      },
      {
        type: "union",
        target: "background",
        inputPathIndexes: [3]
      },
      {
        type: "subtract",
        target: "foreground",
        subject: "foreground",
        operand: "background"
      }
    ]);
  });

  it("subtracts reverse-color paths after uniting the remaining fill paths", () => {
    const source = createSemanticAst(["primary", "accent", "primary"]);
    const semantic: SemanticSvgAst = {
      ...source,
      paths: source.paths.map((path, index) =>
        index === 1 ? { ...path, colorRole: "reverse" } : path
      )
    };
    const rendering = compileFill(semantic, resolveCompilerConfig());

    expect(rendering.layers[0]?.paths.map((path) => path.sourcePathIndex)).toEqual([0, 2]);
    expect(rendering.layers[1]?.paths.map((path) => path.sourcePathIndex)).toEqual([1]);
    expect(rendering.geometryRequests).toEqual([
      {
        type: "union",
        target: "foreground",
        inputPathIndexes: [0, 2]
      },
      {
        type: "union",
        target: "background",
        inputPathIndexes: [1]
      },
      {
        type: "subtract",
        target: "foreground",
        subject: "foreground",
        operand: "background"
      }
    ]);
  });
});
