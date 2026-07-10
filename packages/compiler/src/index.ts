export type {
  CompileSymbolInput,
  CompileSymbolOptions,
  CompileSymbolSource,
  CompileSymbolResult
} from "./pipeline.js";

export {
  DEFAULT_COMPILER_CONFIG,
  mergeCompilerConfig,
  resolveCompilerConfig
} from "./config/index.js";

export { parsePathData, parseSvgSource } from "./parser/index.js";

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
  SymbolOutputMode
} from "./config/index.js";

export type {
  ClassifiedPathNode,
  ClassifiedPathRole,
  PathArcCommand,
  PathAst,
  PathCloseCommand,
  PathCommand,
  PathCubicCurveCommand,
  PathHorizontalLineCommand,
  PathLineCommand,
  PathMoveCommand,
  PathQuadraticCurveCommand,
  PathSmoothCubicCurveCommand,
  PathSmoothQuadraticCurveCommand,
  PathVerticalLineCommand,
  SourcePaint,
  SourcePaintValue,
  SourcePathNode,
  SourceSvgAst,
  SemanticSymbolAst
} from "./ast/index.js";
