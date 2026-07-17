export { DEFAULT_COMPILER_CONFIG } from "./defaults.js";
export { isSymbolVariantBlacklisted } from "./blacklist.js";
export { mergeCompilerConfig } from "./merge.js";
export { parseCompilerConfigInput } from "./parser.js";
export { resolveCompilerConfig } from "./resolver.js";

export type {
  ColorRoleConfigInput,
  CompilerConfigInput,
  CompilerConfigLayers,
  ForegroundInOutlineStrategy,
  OpacityConfigInput,
  OutlineConfigInput,
  ResolvedColorRoleConfig,
  ResolvedCompilerConfig,
  ResolvedOpacityConfig,
  ResolvedOutlineConfig,
  ResolvedRenderingConfig,
  ResolvedSymbolBlacklistConfig,
  ResolvedSemanticIdConfig,
  ResolvedSemanticIdRolesConfig,
  ResolvedStrokeConfig,
  RenderingConfigInput,
  SemanticIdConfigInput,
  SemanticIdRolesConfigInput,
  StrokeConfigInput,
  StrokeLinecap,
  StrokeLinejoin,
  SymbolBlacklistConfigInput,
  SymbolOutputMode,
  SymbolStyleProfileConfigInput,
  SymbolStyleProfilesConfigInput,
  SymbolWeightProfileConfigInput,
  SymbolVariantCombination,
  SymbolWeightProfilesConfigInput
} from "./schema.js";
