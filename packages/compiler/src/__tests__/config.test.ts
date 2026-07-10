import { describe, expect, it } from "vitest";

import {
  DEFAULT_COMPILER_CONFIG,
  parsePathData,
  parseSvgSource,
  resolveCompilerConfig
} from "../index.js";

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
      modes: ["fill", "duotone"]
    });
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
