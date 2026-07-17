import type {
  CompilerConfigInput,
  ResolvedColorRoleConfig,
  ResolvedCompilerConfig,
  ResolvedOpacityConfig,
  ResolvedOutlineConfig,
  ResolvedRenderingConfig,
  ResolvedSemanticIdConfig,
  ResolvedStrokeConfig
} from "./schema.js";

export function mergeCompilerConfig(
  base: ResolvedCompilerConfig,
  override: CompilerConfigInput | undefined
): ResolvedCompilerConfig {
  if (override === undefined) {
    return base;
  }

  return {
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
