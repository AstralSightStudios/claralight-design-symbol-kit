import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  classifySourceSvgAstWithDiagnostics,
  compileDuotone,
  lowerPathAst,
  lowerRenderingGeometry,
  parsePathData,
  parseSvgSource,
  resolveCompilerConfig
} from "../index.js";

const creditCardSvg = readFileSync(
  new URL("../../../../test/CreditCard.svg", import.meta.url),
  "utf8"
);

describe("geometry lowering", () => {
  it("lowers absolute move and line commands", () => {
    const geometry = lowerPathAst(parsePathData("M10 10 L20 20"));

    expect(geometry).toEqual({
      commands: [
        { type: "move", point: { x: 10, y: 10 } },
        { type: "line", point: { x: 20, y: 20 } }
      ]
    });
  });

  it("converts relative commands to absolute coordinates", () => {
    const geometry = lowerPathAst(parsePathData("m10 10 l20 0 c5 0 5 10 10 10"));

    expect(geometry.commands).toEqual([
      { type: "move", point: { x: 10, y: 10 } },
      { type: "line", point: { x: 30, y: 10 } },
      {
        type: "cubic",
        controlPoint1: { x: 35, y: 10 },
        controlPoint2: { x: 35, y: 20 },
        point: { x: 40, y: 20 }
      }
    ]);
  });

  it("converts horizontal and vertical commands to lines", () => {
    const geometry = lowerPathAst(parsePathData("M10 10 H20 v5 h-4 V8"));

    expect(geometry.commands).toEqual([
      { type: "move", point: { x: 10, y: 10 } },
      { type: "line", point: { x: 20, y: 10 } },
      { type: "line", point: { x: 20, y: 15 } },
      { type: "line", point: { x: 16, y: 15 } },
      { type: "line", point: { x: 16, y: 8 } }
    ]);
  });

  it("converts quadratic curves to cubic curves", () => {
    const geometry = lowerPathAst(parsePathData("M0 0 Q3 6 9 0"));
    const cubic = geometry.commands[1];

    expect(cubic?.type).toBe("cubic");
    expect(cubic).toEqual({
      type: "cubic",
      controlPoint1: { x: 2, y: 4 },
      controlPoint2: { x: 5, y: 4 },
      point: { x: 9, y: 0 }
    });
  });

  it("preserves subpaths and resets the current point after close", () => {
    const geometry = lowerPathAst(parsePathData("M10 10 L20 20 Z m20 20 l10 10 Z"));

    expect(geometry.commands).toEqual([
      { type: "move", point: { x: 10, y: 10 } },
      { type: "line", point: { x: 20, y: 20 } },
      { type: "close" },
      { type: "move", point: { x: 30, y: 30 } },
      { type: "line", point: { x: 40, y: 40 } },
      { type: "close" }
    ]);
  });

  it("lowers the real CreditCard fixture through Rendering AST", () => {
    const source = parseSvgSource({ name: "CreditCard", svg: creditCardSvg });
    const config = resolveCompilerConfig({
      project: {
        colors: { foreground: ["#000000"] },
        styles: { duotone: { accentOpacity: 0.2 } }
      }
    });
    const classification = classifySourceSvgAstWithDiagnostics(source, config);
    const rendering = compileDuotone(classification.semantic, config);
    const lowered = lowerRenderingGeometry(rendering);

    expect(classification.diagnostics).toEqual([]);
    expect(lowered.paths.map((path) => path.sourcePathIndex)).toEqual([0, 1, 2, 3]);
    expect(lowered.paths.map((path) => path.geometry.commands.length)).toEqual([12, 176, 2, 4]);
    expect(
      lowered.paths
        .flatMap((path) => path.geometry.commands)
        .every((command) => ["move", "line", "cubic", "close"].includes(command.type))
    ).toBe(true);
    expect(lowered.paths[0]?.geometry).not.toHaveProperty("paint");
    expect(lowered.paths[0]?.geometry).not.toHaveProperty("role");
    expect(
      lowered.paths[3]?.geometry.commands.filter((command) => command.type === "move")
    ).toHaveLength(2);
  });
});
