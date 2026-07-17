import { describe, expect, it } from "vitest";

import {
  DEFAULT_COMPILER_CONFIG,
  parseCompilerConfigInput,
  parsePathData,
  parseSvgSource,
  resolveCompilerConfig
} from "../index.js";

const duotoneStyle = {
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
} as const;

describe("resolveCompilerConfig", () => {
  it("uses built-in defaults without overrides", () => {
    expect(resolveCompilerConfig()).toEqual(DEFAULT_COMPILER_CONFIG);
  });

  it("merges config layers by priority", () => {
    expect(
      resolveCompilerConfig({
        global: {
          blacklist: {
            combinations: [{ weight: "thin", mode: "fill" }]
          },
          colors: {
            foreground: ["#111111"]
          },
          opacity: {
            secondaryThreshold: 0.4
          },
          modes: ["outline"]
        },
        project: {
          blacklist: {
            combinations: [{ weight: "regular", mode: "duotone" }],
            icons: {
              CreditCard: [{ weight: "regular", mode: "fill" }]
            }
          },
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
          modes: ["outline", "fill", "duotone"]
        }
      })
    ).toEqual({
      blacklist: {
        combinations: [
          { weight: "thin", mode: "fill" },
          { weight: "regular", mode: "duotone" }
        ],
        icons: {
          CreditCard: [{ weight: "regular", mode: "fill" }]
        }
      },
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
          lineNoFill: "line-no-fill",
          lineNoDuotone: "line-no-duo",
          lineOnlyFill: "line-only-fill",
          lineOnlyDuotone: "line-only-duo",
          background: "bg",
          backgroundNoFill: "bg-no-fill",
          backgroundNoDuotone: "bg-no-duo"
        },
        reverseModifier: "reverse"
      },
      stroke: {
        strokeLinecap: "round"
      },
      modes: ["outline", "fill", "duotone"]
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

  it("rejects invalid blacklist entries", () => {
    expect(() =>
      resolveCompilerConfig({
        project: {
          blacklist: {
            combinations: [{ weight: "unknown", mode: "fill" }]
          }
        } as never
      })
    ).toThrow("unknown weight");

    expect(() =>
      resolveCompilerConfig({
        project: {
          blacklist: {
            icons: { "": [{ weight: "regular", mode: "fill" }] }
          }
        }
      })
    ).toThrow("icon names must not be empty");
  });

  it("rejects duplicate output modes", () => {
    expect(() => resolveCompilerConfig({ project: { modes: ["outline", "outline"] } })).toThrow(
      "must not contain duplicates"
    );
  });

  it("requires outline while allowing fill and duotone to be omitted", () => {
    expect(resolveCompilerConfig().modes).toEqual(["outline"]);
    expect(resolveCompilerConfig({ project: { modes: ["outline", "fill"] } }).modes).toEqual([
      "outline",
      "fill"
    ]);
    expect(resolveCompilerConfig({ project: { modes: ["outline", "duotone"] } }).modes).toEqual([
      "outline",
      "duotone"
    ]);
    expect(() => resolveCompilerConfig({ project: { modes: ["fill", "duotone"] } })).toThrow(
      'Compiler modes must include the required "outline" mode.'
    );
  });
});

describe("parseCompilerConfigInput", () => {
  it("parses JSON-compatible blacklist and compiler settings", () => {
    expect(
      parseCompilerConfigInput({
        blacklist: {
          combinations: [{ weight: "thin", mode: "fill" }],
          icons: {
            CreditCard: [{ weight: "regular", mode: "duotone" }]
          }
        },
        opacity: { tolerance: 0.01 },
        stroke: { strokeLinecap: "round" },
        modes: ["outline", "fill"]
      })
    ).toEqual({
      blacklist: {
        combinations: [{ weight: "thin", mode: "fill" }],
        icons: {
          CreditCard: [{ weight: "regular", mode: "duotone" }]
        }
      },
      opacity: { tolerance: 0.01 },
      stroke: { strokeLinecap: "round" },
      modes: ["outline", "fill"]
    });
  });

  it("rejects malformed JSON-compatible settings", () => {
    expect(() =>
      parseCompilerConfigInput({
        blacklist: { combinations: [{ weight: "thin", mode: "unknown" }] }
      })
    ).toThrow("mode is invalid");
    expect(() => parseCompilerConfigInput({ rendering: { fillFillOpacity: "1" } })).toThrow(
      "must be a finite number"
    );
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
