import type {
  CompilerConfigInput,
  ResolvedColorRoleConfig,
  ResolvedCompilerConfig,
  ResolvedSymbolBlacklistConfig,
  ResolvedOpacityConfig,
  ResolvedOutlineConfig,
  ResolvedRenderingConfig,
  ResolvedSemanticIdConfig,
  ResolvedStrokeConfig,
  SymbolVariantCombination
} from "./schema.js";

export function mergeCompilerConfig(
  base: ResolvedCompilerConfig,
  override: CompilerConfigInput | undefined
): ResolvedCompilerConfig {
  if (override === undefined) {
    return base;
  }

  return {
    blacklist: mergeBlacklistConfig(base.blacklist, override.blacklist),
    colors: mergeColorRoleConfig(base.colors, override.colors),
    opacity: mergeOpacityConfig(base.opacity, override.opacity),
    outline: mergeOutlineConfig(base.outline, override.outline),
    styles: { ...base.styles, ...override.styles },
    weights: { ...base.weights, ...override.weights },
    rendering: mergeRenderingConfig(base.rendering, override.rendering),
    semanticIds: mergeSemanticIdConfig(base.semanticIds, override.semanticIds),
    stroke: mergeStrokeConfig(base.stroke, override.stroke),
    modes: override.modes ?? base.modes
  };
}

function mergeBlacklistConfig(
  base: ResolvedSymbolBlacklistConfig,
  override: CompilerConfigInput["blacklist"]
): ResolvedSymbolBlacklistConfig {
  if (override === undefined) {
    return base;
  }

  const icons: Record<string, readonly SymbolVariantCombination[]> = {
    ...base.icons
  };
  for (const [name, combinations] of Object.entries(override.icons ?? {})) {
    icons[name] = mergeVariantCombinations(icons[name] ?? [], combinations);
  }

  return {
    combinations: mergeVariantCombinations(base.combinations, override.combinations ?? []),
    icons
  };
}

function mergeVariantCombinations(
  base: readonly SymbolVariantCombination[],
  override: readonly SymbolVariantCombination[]
): readonly SymbolVariantCombination[] {
  const combinations = new Map<string, SymbolVariantCombination>();
  for (const combination of [...base, ...override]) {
    combinations.set(`${combination.weight}:${combination.mode}`, combination);
  }
  return [...combinations.values()];
}

function mergeSemanticIdConfig(
  base: ResolvedSemanticIdConfig,
  override: CompilerConfigInput["semanticIds"]
): ResolvedSemanticIdConfig {
  if (override === undefined) {
    return base;
  }

  return {
    prefix: override.prefix ?? base.prefix,
    separator: override.separator ?? base.separator,
    roles: {
      line: override.roles?.line ?? base.roles.line,
      duotoneLine: override.roles?.duotoneLine ?? base.roles.duotoneLine,
      lineNoFill: override.roles?.lineNoFill ?? base.roles.lineNoFill,
      lineNoDuotone: override.roles?.lineNoDuotone ?? base.roles.lineNoDuotone,
      lineOnlyFill: override.roles?.lineOnlyFill ?? base.roles.lineOnlyFill,
      lineOnlyDuotone: override.roles?.lineOnlyDuotone ?? base.roles.lineOnlyDuotone,
      background: override.roles?.background ?? base.roles.background,
      backgroundNoFill: override.roles?.backgroundNoFill ?? base.roles.backgroundNoFill,
      backgroundNoDuotone: override.roles?.backgroundNoDuotone ?? base.roles.backgroundNoDuotone
    },
    reverseModifier: override.reverseModifier ?? base.reverseModifier
  };
}

function mergeRenderingConfig(
  base: ResolvedRenderingConfig,
  override: CompilerConfigInput["rendering"]
): ResolvedRenderingConfig {
  if (override === undefined) {
    return base;
  }

  return {
    duotoneFillOpacity: override.duotoneFillOpacity ?? base.duotoneFillOpacity,
    fillFillOpacity: override.fillFillOpacity ?? base.fillFillOpacity
  };
}

function mergeColorRoleConfig(
  base: ResolvedColorRoleConfig,
  override: CompilerConfigInput["colors"]
): ResolvedColorRoleConfig {
  if (override === undefined) {
    return base;
  }

  return {
    foreground: override.foreground ?? base.foreground,
    background: override.background ?? base.background
  };
}

function mergeOpacityConfig(
  base: ResolvedOpacityConfig,
  override: CompilerConfigInput["opacity"]
): ResolvedOpacityConfig {
  if (override === undefined) {
    return base;
  }

  return {
    full: override.full ?? base.full,
    tolerance: override.tolerance ?? base.tolerance,
    secondaryThreshold: override.secondaryThreshold ?? base.secondaryThreshold
  };
}

function mergeOutlineConfig(
  base: ResolvedOutlineConfig,
  override: CompilerConfigInput["outline"]
): ResolvedOutlineConfig {
  if (override === undefined) {
    return base;
  }

  return {
    foreground: override.foreground ?? base.foreground
  };
}

function mergeStrokeConfig(
  base: ResolvedStrokeConfig,
  override: CompilerConfigInput["stroke"]
): ResolvedStrokeConfig {
  if (override === undefined) {
    return base;
  }

  const strokeLinecap = override.strokeLinecap ?? base.strokeLinecap;
  const strokeLinejoin = override.strokeLinejoin ?? base.strokeLinejoin;

  return {
    ...(strokeLinecap === undefined ? {} : { strokeLinecap }),
    ...(strokeLinejoin === undefined ? {} : { strokeLinejoin })
  };
}
