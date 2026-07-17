import type { ResolvedCompilerConfig } from "./schema.js";

export const DEFAULT_COMPILER_CONFIG: ResolvedCompilerConfig = {
  blacklist: {
    combinations: [],
    icons: {}
  },
  colors: {
    foreground: [],
    background: []
  },
  opacity: {
    full: 1,
    tolerance: 0.001,
    secondaryThreshold: 1
  },
  outline: {
    foreground: "drop"
  },
  styles: {},
  weights: {},
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
  stroke: {},
  modes: ["outline"]
};
