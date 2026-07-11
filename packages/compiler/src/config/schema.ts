import type { SymbolWeight } from "@claralight-design/symbol-kit-core";

export type ForegroundInOutlineStrategy = "drop" | "convert-to-background";

export type SymbolOutputMode = "outline" | "fill" | "duotone";

export type StrokeLinecap = "butt" | "round" | "square";

export type StrokeLinejoin = "miter" | "round" | "bevel";

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

export interface SymbolStyleProfileConfigInput {
  readonly color: string;
  readonly reverse: string;
  readonly lineOpacity: number;
  readonly duotoneLineOpacity: number;
  readonly backgroundOpacity: number;
  readonly noFillBackgroundOpacity: number;
  readonly noDuotoneBackgroundOpacity: number;
}

export type SymbolStyleProfilesConfigInput = Readonly<
  Record<string, SymbolStyleProfileConfigInput>
>;

export interface SymbolWeightProfileConfigInput {
  readonly strokeWidth: number;
  readonly tolerance?: number;
}

export type SymbolWeightProfilesConfigInput = Readonly<
  Partial<Record<SymbolWeight, SymbolWeightProfileConfigInput>>
>;

export interface RenderingConfigInput {
  readonly duotoneFillOpacity?: number;
  readonly fillFillOpacity?: number;
}

export interface ResolvedRenderingConfig {
  readonly duotoneFillOpacity: number;
  readonly fillFillOpacity: number;
}

export interface SemanticIdRolesConfigInput {
  readonly line?: string;
  readonly duotoneLine?: string;
  readonly background?: string;
  readonly backgroundNoFill?: string;
  readonly backgroundNoDuotone?: string;
}

export interface ResolvedSemanticIdRolesConfig {
  readonly line: string;
  readonly duotoneLine: string;
  readonly background: string;
  readonly backgroundNoFill: string;
  readonly backgroundNoDuotone: string;
}

export interface SemanticIdConfigInput {
  readonly prefix?: string;
  readonly separator?: string;
  readonly roles?: SemanticIdRolesConfigInput;
  readonly reverseModifier?: string;
}

export interface ResolvedSemanticIdConfig {
  readonly prefix: string;
  readonly separator: string;
  readonly roles: ResolvedSemanticIdRolesConfig;
  readonly reverseModifier: string;
}

export interface StrokeConfigInput {
  readonly strokeLinecap?: StrokeLinecap;
  readonly strokeLinejoin?: StrokeLinejoin;
}

export interface ResolvedStrokeConfig {
  readonly strokeLinecap?: StrokeLinecap;
  readonly strokeLinejoin?: StrokeLinejoin;
}

export interface CompilerConfigInput {
  readonly colors?: ColorRoleConfigInput;
  readonly opacity?: OpacityConfigInput;
  readonly outline?: OutlineConfigInput;
  readonly styles?: SymbolStyleProfilesConfigInput;
  readonly weights?: SymbolWeightProfilesConfigInput;
  readonly rendering?: RenderingConfigInput;
  readonly semanticIds?: SemanticIdConfigInput;
  readonly stroke?: StrokeConfigInput;
  readonly modes?: readonly SymbolOutputMode[];
}

export interface ResolvedCompilerConfig {
  readonly colors: ResolvedColorRoleConfig;
  readonly opacity: ResolvedOpacityConfig;
  readonly outline: ResolvedOutlineConfig;
  readonly styles: SymbolStyleProfilesConfigInput;
  readonly weights: SymbolWeightProfilesConfigInput;
  readonly rendering: ResolvedRenderingConfig;
  readonly semanticIds: ResolvedSemanticIdConfig;
  readonly stroke: ResolvedStrokeConfig;
  readonly modes: readonly SymbolOutputMode[];
}

export interface CompilerConfigLayers {
  readonly global?: CompilerConfigInput;
  readonly project?: CompilerConfigInput;
  readonly cli?: CompilerConfigInput;
}
