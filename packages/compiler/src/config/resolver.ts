import { isSymbolWeight } from "@claralight-design/symbol-kit-core";

import { DEFAULT_COMPILER_CONFIG } from "./defaults.js";
import { mergeCompilerConfig } from "./merge.js";
import type { CompilerConfigLayers, ResolvedCompilerConfig } from "./schema.js";

export function resolveCompilerConfig(layers: CompilerConfigLayers = {}): ResolvedCompilerConfig {
  const config = mergeCompilerConfig(
    mergeCompilerConfig(
      mergeCompilerConfig(DEFAULT_COMPILER_CONFIG, layers.global),
      layers.project
    ),
    layers.cli
  );

  validateCompilerConfig(config);
  return config;
}

function validateCompilerConfig(config: ResolvedCompilerConfig): void {
  for (const [name, profile] of Object.entries(config.styles)) {
    if (
      !Number.isFinite(profile.accentOpacity) ||
      profile.accentOpacity < 0 ||
      profile.accentOpacity > 1
    ) {
      throw new TypeError(`Style profile "${name}" accentOpacity must be between 0 and 1.`);
    }
  }

  for (const [name, profile] of Object.entries(config.weights)) {
    if (!isSymbolWeight(name)) {
      throw new TypeError(`Unknown weight profile: ${name}.`);
    }
    if (!Number.isFinite(profile.strokeWidth) || profile.strokeWidth <= 0) {
      throw new TypeError(`Weight profile "${name}" strokeWidth must be greater than zero.`);
    }
    if (
      profile.tolerance !== undefined &&
      (!Number.isFinite(profile.tolerance) || profile.tolerance < 0)
    ) {
      throw new TypeError(`Weight profile "${name}" tolerance must not be negative.`);
    }
  }
}
