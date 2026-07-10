import type {
  CompilerConfigInput,
  ResolvedColorRoleConfig,
  ResolvedCompilerConfig,
  ResolvedOpacityConfig,
  ResolvedOutlineConfig
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
    modes: override.modes ?? base.modes
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
