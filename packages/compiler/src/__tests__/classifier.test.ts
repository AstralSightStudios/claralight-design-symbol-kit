import { describe, expect, it } from "vitest";

import {
  classifySourceSvgAst,
  classifySourceSvgAstWithDiagnostics,
  inferSymbolWeight,
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

  it("classifies the four conditional line semantic ids", () => {
    const ids = [
      "sk-line-no-fill--vector-1",
      "sk-line-no-duo--vector-2",
      "sk-line-only-fill--vector-3",
      "sk-line-only-duo--vector-4"
    ] as const;
    const source = createSourceAst(
      ids.map((id, index) => ({
        id,
        d: `M0 ${String(index)}H12`,
        paint: { fill: "none", stroke: "#000000", strokeWidth: 1, opacity: 1 },
        paintOrder: index
      }))
    );

    expect(
      classifySourceSvgAst(source, resolveCompilerConfig()).paths.map((path) => path.role)
    ).toEqual(["line-no-fill", "line-no-duotone", "line-only-fill", "line-only-duotone"]);
  });

  it("preserves reverse color semantics for a fill-only line id", () => {
    const source = createSourceAst([
      {
        id: "sk-line-only-fill--vector-1",
        d: "M4 12H20",
        paint: {
          fill: "none",
          stroke: "#FFFFFF",
          strokeWidth: 1,
          opacity: 0.2
        },
        paintOrder: 0
      }
    ]);
    const config = resolveCompilerConfig({
      project: {
        colors: {
          foreground: ["#000000"],
          background: ["#FFFFFF"]
        }
      }
    });

    expect(classifySourceSvgAst(source, config).paths[0]).toMatchObject({
      role: "line-only-fill",
      colorRole: "reverse"
    });
  });

  it("classifies the four conditional line build opacities", () => {
    const opacities = [0.5, 0.4, 0.2, 0.7] as const;
    const source = createSourceAst(
      opacities.map((opacity, index) => ({
        d: `M0 ${String(index)}H12`,
        paint: { fill: "none", stroke: "#000000", strokeWidth: 1, opacity },
        paintOrder: index
      }))
    );
    const config = resolveCompilerConfig({
      project: {
        styles: {
          build: {
            color: "#000000",
            reverse: "#FFFFFF",
            lineOpacity: 0.1,
            duotoneLineOpacity: 0.6,
            noFillLineOpacity: 0.5,
            noDuotoneLineOpacity: 0.4,
            onlyFillLineOpacity: 0.2,
            onlyDuotoneLineOpacity: 0.7,
            backgroundOpacity: 0.8,
            noFillBackgroundOpacity: 0.1,
            noDuotoneBackgroundOpacity: 0.9
          }
        }
      }
    });

    expect(classifySourceSvgAstWithDiagnostics(source, config)).toMatchObject({
      semantic: {
        paths: [
          { role: "line-no-fill" },
          { role: "line-no-duotone" },
          { role: "line-only-fill" },
          { role: "line-only-duotone" }
        ]
      },
      diagnostics: []
    });
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
            noFillLineOpacity: 0,
            noDuotoneLineOpacity: 1,
            onlyFillLineOpacity: 1,
            onlyDuotoneLineOpacity: 0,
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
            noFillLineOpacity: 0,
            noDuotoneLineOpacity: 1,
            onlyFillLineOpacity: 1,
            onlyDuotoneLineOpacity: 0,
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

  it("uses Build background opacities instead of output style opacities for source classification", () => {
    const source = createSourceAst([
      {
        d: "M0 0H24V24H0Z",
        paint: {
          fill: "#000000",
          opacity: 0.8
        },
        paintOrder: 0
      },
      {
        d: "M4 4H20V20H4Z",
        paint: {
          fill: "none",
          stroke: "#000000",
          strokeWidth: 0.6,
          opacity: 1
        },
        paintOrder: 1
      },
      {
        d: "M8 12H16",
        paint: {
          fill: "none",
          stroke: "#FFFFFF",
          strokeWidth: 0.6,
          opacity: 1
        },
        paintOrder: 2
      },
      {
        d: "M8 8H16V16H8Z",
        paint: {
          fill: "#000000",
          opacity: 0.2
        },
        paintOrder: 3
      }
    ]);
    const config = resolveCompilerConfig({
      project: {
        colors: {
          foreground: ["#000000"],
          background: ["#FFFFFF"]
        },
        styles: {
          build: {
            color: "#000000",
            reverse: "#FFFFFF",
            lineOpacity: 0.1,
            duotoneLineOpacity: 0.6,
            noFillLineOpacity: 0.5,
            noDuotoneLineOpacity: 0.4,
            onlyFillLineOpacity: 0.2,
            onlyDuotoneLineOpacity: 0.7,
            backgroundOpacity: 0.8,
            noFillBackgroundOpacity: 0.1,
            noDuotoneBackgroundOpacity: 0.9
          },
          fill: {
            color: "#000000",
            reverse: "#FFFFFF",
            lineOpacity: 0,
            duotoneLineOpacity: 1,
            noFillLineOpacity: 0,
            noDuotoneLineOpacity: 1,
            onlyFillLineOpacity: 1,
            onlyDuotoneLineOpacity: 0,
            backgroundOpacity: 1,
            noFillBackgroundOpacity: 0,
            noDuotoneBackgroundOpacity: 1
          },
          duotone: {
            color: "#000000",
            reverse: "#000000",
            lineOpacity: 0,
            duotoneLineOpacity: 1,
            noFillLineOpacity: 1,
            noDuotoneLineOpacity: 0,
            onlyFillLineOpacity: 0,
            onlyDuotoneLineOpacity: 1,
            backgroundOpacity: 0.2,
            noFillBackgroundOpacity: 0.2,
            noDuotoneBackgroundOpacity: 0
          }
        }
      }
    });

    expect(classifySourceSvgAstWithDiagnostics(source, config)).toMatchObject({
      semantic: {
        paths: [
          { role: "accent" },
          { role: "primary" },
          { role: "cutout" },
          { role: "accent" }
        ]
      },
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

describe("inferSymbolWeight", () => {
  it("includes SVG path ids in inconsistent stroke-width diagnostics", () => {
    const source = createSourceAst([
      {
        id: "sk-line--vector-1",
        d: "M0 0H12",
        paint: { fill: "none", stroke: "#000000", strokeWidth: 2.2, opacity: 1 },
        paintOrder: 0
      },
      {
        id: "sk-line--vector-2",
        d: "M0 2H12",
        paint: { fill: "none", stroke: "#000000", strokeWidth: 2.2, opacity: 1 },
        paintOrder: 1
      },
      {
        id: "sk-duotone-line--vector-15",
        d: "M0 4H12",
        paint: { fill: "none", stroke: "#000000", strokeWidth: 0.6, opacity: 0.6 },
        paintOrder: 2
      }
    ]);
    const config = resolveCompilerConfig({ cli: { weights: { regular: { strokeWidth: 2.2 } } } });

    expect(inferSymbolWeight(source, config).diagnostics).toEqual([
      {
        severity: "error",
        code: "weight.stroke-width-inconsistent",
        message:
          "Weight inference found inconsistent stroke widths: 2.2 [sk-line--vector-1, sk-line--vector-2]; 0.6 [sk-duotone-line--vector-15]."
      }
    ]);
  });

  it("uses path positions when SVG path ids are missing", () => {
    const source = createSourceAst([
      {
        d: "M0 0H12",
        paint: { fill: "none", stroke: "#000000", strokeWidth: 2.2, opacity: 1 },
        paintOrder: 0
      },
      {
        d: "M0 2H12",
        paint: { fill: "none", stroke: "#000000", strokeWidth: 0.6, opacity: 1 },
        paintOrder: 1
      }
    ]);
    const config = resolveCompilerConfig({ cli: { weights: { regular: { strokeWidth: 2.2 } } } });

    expect(inferSymbolWeight(source, config).diagnostics[0]?.message).toBe(
      "Weight inference found inconsistent stroke widths: 2.2 [path #1]; 0.6 [path #2]."
    );
  });
});
