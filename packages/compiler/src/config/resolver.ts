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
  validateBlacklist(config);

  if (!config.modes.includes("outline")) {
    throw new TypeError('Compiler modes must include the required "outline" mode.');
  }
  if (new Set(config.modes).size !== config.modes.length) {
    throw new TypeError("Compiler modes must not contain duplicates.");
  }

  validateOpacity(config.opacity.full, "Opacity full");
  validateOpacity(config.opacity.tolerance, "Opacity tolerance");
  validateOpacity(config.opacity.secondaryThreshold, "Opacity secondaryThreshold");

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

function validateBlacklist(config: ResolvedCompilerConfig): void {
  for (const name of Object.keys(config.blacklist.icons)) {
    if (name.trim().length === 0) {
      throw new TypeError("Blacklist icon names must not be empty.");
    }
  }

  for (const [label, combinations] of [
    ["global", config.blacklist.combinations],
    ...Object.entries(config.blacklist.icons).map(
      ([name, rules]) => [`icon "${name}"`, rules] as const
    )
  ] as const) {
    for (const combination of combinations) {
      if (!isSymbolWeight(combination.weight)) {
        throw new TypeError(`Blacklist ${label} uses an unknown weight: ${combination.weight}.`);
      }
      if (!isOutputMode(combination.mode)) {
        throw new TypeError(
          `Blacklist ${label} uses an unknown mode: ${String(combination.mode)}.`
        );
      }
    }
  }
}

function isOutputMode(value: string): value is ResolvedCompilerConfig["modes"][number] {
  return value === "outline" || value === "fill" || value === "duotone";
}

function validateSemanticIds(config: ResolvedCompilerConfig): void {
  const values = [
    config.semanticIds.prefix,
    config.semanticIds.separator,
    config.semanticIds.reverseModifier,
    config.semanticIds.roles.line,
    config.semanticIds.roles.duotoneLine,
    config.semanticIds.roles.lineNoFill,
    config.semanticIds.roles.lineNoDuotone,
    config.semanticIds.roles.lineOnlyFill,
    config.semanticIds.roles.lineOnlyDuotone,
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
