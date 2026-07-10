export type ForegroundInOutlineStrategy = "drop" | "convert-to-background";

export type SymbolOutputMode = "outline" | "fill" | "duotone";

export interface ColorRoleConfigInput {
  readonly foreground?: readonly string[];
  readonly background?: readonly string[];
}

export interface ResolvedColorRoleConfig {
  readonly foreground: readonly string[];
  readonly background: readonly string[];
}

export interface OpacityConfigInput {
  readonly full?: number;
  readonly tolerance?: number;
  readonly secondaryThreshold?: number;
}

export interface ResolvedOpacityConfig {
  readonly full: number;
  readonly tolerance: number;
  readonly secondaryThreshold: number;
}

export interface OutlineConfigInput {
  readonly foreground?: ForegroundInOutlineStrategy;
}

export interface ResolvedOutlineConfig {
  readonly foreground: ForegroundInOutlineStrategy;
}

export interface CompilerConfigInput {
  readonly colors?: ColorRoleConfigInput;
  readonly opacity?: OpacityConfigInput;
  readonly outline?: OutlineConfigInput;
  readonly modes?: readonly SymbolOutputMode[];
}

export interface ResolvedCompilerConfig {
  readonly colors: ResolvedColorRoleConfig;
  readonly opacity: ResolvedOpacityConfig;
  readonly outline: ResolvedOutlineConfig;
  readonly modes: readonly SymbolOutputMode[];
}

export interface CompilerConfigLayers {
  readonly global?: CompilerConfigInput;
  readonly project?: CompilerConfigInput;
  readonly cli?: CompilerConfigInput;
}
