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

export { classifySourceSvgAst } from "./classifier/index.js";

export { compileDuotone, compileFill, compileOutline } from "./rendering/index.js";

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
  SemanticPathNode,
  SemanticRole,
  SemanticSvgAst,
  SemanticSymbolAst
} from "./ast/index.js";

export type {
  DuotoneRenderingAst,
  FillBooleanGroup,
  FillBooleanOperation,
  FillRenderingAst,
  OutlineRenderingAst,
  RenderingAst,
  RenderingAstBase,
  RenderingLayer,
  RenderingLayerKind,
  RenderingMode,
  RenderingPathNode
} from "./rendering/index.js";
