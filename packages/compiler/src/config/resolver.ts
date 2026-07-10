import { DEFAULT_COMPILER_CONFIG } from "./defaults.js";
import { mergeCompilerConfig } from "./merge.js";
import type { CompilerConfigLayers, ResolvedCompilerConfig } from "./schema.js";

export function resolveCompilerConfig(layers: CompilerConfigLayers = {}): ResolvedCompilerConfig {
  return mergeCompilerConfig(
    mergeCompilerConfig(
      mergeCompilerConfig(DEFAULT_COMPILER_CONFIG, layers.global),
      layers.project
    ),
    layers.cli
  );
}
