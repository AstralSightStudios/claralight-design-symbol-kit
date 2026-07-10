export type {
  CompileAstSource,
  CompileDiagnostic,
  CompileDiagnosticSeverity,
  CompileInput,
  CompileResult,
  CompileSymbolInput,
  CompileSymbolSource,
  CompileSymbolResult,
  CompileSvgSource
} from "./pipeline.js";

export { compileSymbol } from "./pipeline.js";

export {
  DEFAULT_COMPILER_CONFIG,
  mergeCompilerConfig,
  resolveCompilerConfig
} from "./config/index.js";

export { classifySourceSvgAst } from "./classifier/index.js";

export {
  compileDuotone,
  compileFill,
  compileOutline,
  compileRendering
} from "./rendering/index.js";

export { createSymbolIr, createSymbolVariant } from "./ir/index.js";

export { NoopGeometryProcessor } from "./geometry/index.js";

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
  FillGeometryRequest,
  FillRenderingAst,
  OutlineRenderingAst,
  RenderingAst,
  RenderingAstBase,
  RenderingLayer,
  RenderingLayerKind,
  RenderingMode,
  RenderingPathNode
} from "./rendering/index.js";

export type {
  GeometryMaterializationInput,
  GeometryMaterializer,
  GeometryCloseCommand,
  GeometryCubicCommand,
  GeometryLineCommand,
  GeometryMoveCommand,
  GeometryPath,
  GeometryPathCommand,
  GeometryPoint,
  GeometryProcessor,
  GeometryRegion
} from "./geometry/index.js";

export type {
  CreateSymbolIrInput,
  MaterializedVariantGeometry,
  SymbolIrVariantInput
} from "./ir/index.js";
