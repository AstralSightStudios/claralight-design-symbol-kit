import { describe, expect, it } from "vitest";

import {
  DEFAULT_COMPILER_CONFIG,
  parsePathData,
  parseSvgSource,
  resolveCompilerConfig
} from "../index.js";

const duotoneStyle = {
  color: "#000000",
  reverse: "#000000",
  lineOpacity: 0,
  duotoneLineOpacity: 0.7,
  backgroundOpacity: 0.2,
  noFillBackgroundOpacity: 0.3,
  noDuotoneBackgroundOpacity: 0
} as const;

describe("resolveCompilerConfig", () => {
  it("uses built-in defaults without overrides", () => {
    expect(resolveCompilerConfig()).toEqual(DEFAULT_COMPILER_CONFIG);
  });

  it("merges config layers by priority", () => {
    expect(
      resolveCompilerConfig({
        global: {
          colors: {
            foreground: ["#111111"]
          },
          opacity: {
            secondaryThreshold: 0.4
          },
          modes: ["outline"]
        },
        project: {
          colors: {
            background: ["#ffffff"]
          },
          outline: {
            foreground: "convert-to-background"
          },
          styles: {
            duotone: duotoneStyle
          },
          weights: {
            regular: {
              strokeWidth: 1.5
            }
          },
          stroke: {
            strokeLinecap: "round"
          }
        },
        cli: {
          colors: {
            foreground: ["#000000"]
          },
          modes: ["fill", "duotone"]
        }
      })
    ).toEqual({
      colors: {
        foreground: ["#000000"],
        background: ["#ffffff"]
      },
      opacity: {
        full: 1,
        tolerance: 0.001,
        secondaryThreshold: 0.4
      },
      outline: {
        foreground: "convert-to-background"
      },
      styles: {
        duotone: duotoneStyle
      },
      weights: {
        regular: {
          strokeWidth: 1.5
        }
      },
      rendering: {
        duotoneFillOpacity: 0.2,
        fillFillOpacity: 1
      },
      semanticIds: {
        prefix: "sk-",
        separator: "--",
        roles: {
          line: "line",
          duotoneLine: "duotone-line",
          background: "bg",
          backgroundNoFill: "bg-no-fill",
          backgroundNoDuotone: "bg-no-duo"
        },
        reverseModifier: "reverse"
      },
      stroke: {
        strokeLinecap: "round"
      },
      modes: ["fill", "duotone"]
    });
  });

  it("rejects invalid style and weight profiles", () => {
    expect(() =>
      resolveCompilerConfig({
        project: {
          styles: {
            duotone: {
              ...duotoneStyle,
              lineOpacity: 1.2
            }
          }
        }
      })
    ).toThrow('Style profile "duotone" lineOpacity must be between 0 and 1.');

    expect(() =>
      resolveCompilerConfig({
        project: {
          weights: { regular: { strokeWidth: 0 } }
        }
      })
    ).toThrow('Weight profile "regular" strokeWidth must be greater than zero.');
  });
});

describe("parser skeleton", () => {
  it("rejects empty SVG input before parsing", () => {
    expect(() => parseSvgSource({ name: "empty", svg: "" })).toThrow(TypeError);
  });

  it("rejects empty path data before parsing", () => {
    expect(() => parsePathData(" ")).toThrow(TypeError);
  });
});
