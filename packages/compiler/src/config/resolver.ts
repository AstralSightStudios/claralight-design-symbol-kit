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
    if (profile.color.trim().length === 0 || profile.reverse.trim().length === 0) {
      throw new TypeError(`Style profile "${name}" colors must not be empty.`);
    }

    for (const [field, value] of Object.entries(profile).filter(
      (entry): entry is [string, number] => typeof entry[1] === "number"
    )) {
      validateOpacity(value, `Style profile "${name}" ${field}`);
    }
  }

  validateOpacity(config.rendering.duotoneFillOpacity, "Rendering duotoneFillOpacity");
  validateOpacity(config.rendering.fillFillOpacity, "Rendering fillFillOpacity");
  validateSemanticIds(config);

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

function validateSemanticIds(config: ResolvedCompilerConfig): void {
  const values = [
    config.semanticIds.prefix,
    config.semanticIds.separator,
    config.semanticIds.reverseModifier,
    config.semanticIds.roles.line,
    config.semanticIds.roles.duotoneLine,
    config.semanticIds.roles.background,
    config.semanticIds.roles.backgroundNoFill,
    config.semanticIds.roles.backgroundNoDuotone
  ];

  if (values.some((value) => value.trim().length === 0)) {
    throw new TypeError("Semantic ID configuration values must not be empty.");
  }
}

function validateOpacity(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new TypeError(`${label} must be between 0 and 1.`);
  }
}
