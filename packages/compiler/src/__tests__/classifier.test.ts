import { describe, expect, it } from "vitest";

import {
  classifySourceSvgAst,
  classifySourceSvgAstWithDiagnostics,
  parsePathData,
  resolveCompilerConfig,
  type SourcePathNode,
  type SourceSvgAst
} from "../index.js";

type SourcePathInput = Omit<SourcePathNode, "path">;

function createSourceAst(paths: readonly SourcePathInput[]): SourceSvgAst {
  return {
    name: "test-symbol",
    viewBox: {
      x: 0,
      y: 0,
      width: 24,
      height: 24
    },
    paths: paths.map((path) => ({
      ...path,
      path: parsePathData(path.d)
    }))
  };
}

describe("classifySourceSvgAst", () => {
  it("classifies a default full-opacity path as primary", () => {
    const source = createSourceAst([
      {
        d: "M0 0H24V24H0Z",
        paint: {
          fill: "#000000",
          opacity: 1
        },
        paintOrder: 0
      }
    ]);

    expect(classifySourceSvgAst(source, resolveCompilerConfig()).paths[0]?.role).toBe("primary");
  });

  it("classifies paths below the opacity threshold as secondary", () => {
    const source = createSourceAst([
      {
        d: "M0 0H24V24H0Z",
        paint: {
          fill: "#000000",
          opacity: 0.4
        },
        paintOrder: 0
      }
    ]);
    const config = resolveCompilerConfig({
      cli: {
        opacity: {
          secondaryThreshold: 0.5
        }
      }
    });

    expect(classifySourceSvgAst(source, config).paths[0]?.role).toBe("secondary");
  });

  it("classifies configured foreground and background colors", () => {
    const source = createSourceAst([
      {
        d: "M0 0H24V24H0Z",
        paint: {
          fill: "#111111",
          opacity: 1
        },
        paintOrder: 0
      },
      {
        d: "M4 4H20V20H4Z",
        paint: {
          fill: "#FFFFFF",
          opacity: 1
        },
        paintOrder: 1
      }
    ]);
    const config = resolveCompilerConfig({
      cli: {
        colors: {
          foreground: ["#111111"],
          background: ["#ffffff"]
        }
      }
    });

    expect(classifySourceSvgAst(source, config).paths.map((path) => path.role)).toEqual([
      "primary",
      "cutout"
    ]);
  });

  it("classifies configured background strokes as cutouts", () => {
    const source = createSourceAst([
      {
        d: "M4 4H20V20H4Z",
        paint: {
          fill: "none",
          stroke: "#FFFFFF",
          strokeWidth: 0.6,
          opacity: 1
        },
        paintOrder: 0
      }
    ]);
    const config = resolveCompilerConfig({
      cli: {
        colors: {
          foreground: ["#000000"],
          background: ["#ffffff"]
        }
      }
    });

    expect(classifySourceSvgAstWithDiagnostics(source, config)).toMatchObject({
      semantic: { paths: [{ role: "cutout", colorRole: "reverse" }] },
      diagnostics: []
    });
  });

  it("derives a distinct background color from style reverse values", () => {
    const source = createSourceAst([
      {
        d: "M4 4H20V20H4Z",
        paint: {
          fill: "none",
          stroke: "white",
          strokeWidth: 0.6,
          opacity: 1
        },
        paintOrder: 0
      }
    ]);
    const config = resolveCompilerConfig({
      cli: {
        colors: { foreground: ["#000000"] },
        styles: {
          fill: {
            color: "#000000",
            reverse: "#FFFFFF",
            lineOpacity: 0,
            duotoneLineOpacity: 0.6,
            backgroundOpacity: 0.8,
            noFillBackgroundOpacity: 0,
            noDuotoneBackgroundOpacity: 0.9
          }
        }
      }
    });

    expect(classifySourceSvgAstWithDiagnostics(source, config)).toMatchObject({
      semantic: { paths: [{ role: "cutout", colorRole: "reverse" }] },
      diagnostics: []
    });
  });

  it("uses configured background opacity for combined fill and stroke paths", () => {
    const source = createSourceAst([
      {
        d: "M4 4H20V20H4Z",
        paint: {
          fill: "#000000",
          stroke: "#000000",
          strokeWidth: 0.6,
          opacity: 0.9
        },
        paintOrder: 0
      }
    ]);
    const config = resolveCompilerConfig({
      cli: {
        styles: {
          fill: {
            color: "#000000",
            reverse: "#FFFFFF",
            lineOpacity: 0,
            duotoneLineOpacity: 0.6,
            backgroundOpacity: 0.8,
            noFillBackgroundOpacity: 0,
            noDuotoneBackgroundOpacity: 0.9
          }
        }
      }
    });

    expect(classifySourceSvgAstWithDiagnostics(source, config)).toMatchObject({
      semantic: { paths: [{ role: "background-no-duotone" }] },
      diagnostics: []
    });
  });

  it("allows a missing source stroke width when weight is supplied elsewhere", () => {
    const source = createSourceAst([
      {
        d: "M4 4H20V20H4Z",
        paint: {
          fill: "none",
          stroke: "#000000",
          opacity: 1
        },
        paintOrder: 0
      }
    ]);

    expect(classifySourceSvgAstWithDiagnostics(source, resolveCompilerConfig())).toMatchObject({
      semantic: { paths: [{ role: "primary" }] },
      diagnostics: []
    });
  });

  it("classifies unmatched configured colors as unknown", () => {
    const source = createSourceAst([
      {
        d: "M0 0H24V24H0Z",
        paint: {
          fill: "#00ff00",
          opacity: 1
        },
        paintOrder: 0
      }
    ]);
    const config = resolveCompilerConfig({
      cli: {
        colors: {
          foreground: ["#000000"],
          background: ["#ffffff"]
        }
      }
    });

    expect(classifySourceSvgAst(source, config).paths[0]?.role).toBe("unknown");
  });

  it("does not modify the source AST", () => {
    const source = createSourceAst([
      {
        d: "M0 0H24V24H0Z",
        paint: {
          fill: "#000000",
          opacity: 1
        },
        paintOrder: 0
      }
    ]);

    classifySourceSvgAst(source, resolveCompilerConfig());

    expect(source.paths.map((path) => "role" in path)).toEqual([false]);
  });
});
