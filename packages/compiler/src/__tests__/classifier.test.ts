import { describe, expect, it } from "vitest";

import {
  classifySourceSvgAst,
  resolveCompilerConfig,
  type SourceSvgAst
} from "../index.js";

function createSourceAst(paths: SourceSvgAst["paths"]): SourceSvgAst {
  return {
    name: "test-symbol",
    viewBox: {
      x: 0,
      y: 0,
      width: 24,
      height: 24
    },
    paths
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
