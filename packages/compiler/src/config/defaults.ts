import type { ResolvedCompilerConfig } from "./schema.js";

export const DEFAULT_COMPILER_CONFIG: ResolvedCompilerConfig = {
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
  stroke: {},
  modes: ["outline", "fill", "duotone"]
};
