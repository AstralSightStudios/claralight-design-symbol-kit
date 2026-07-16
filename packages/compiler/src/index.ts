export type {
  CompileAstSource,
  CompileDiagnostic,
  CompileDiagnosticSeverity,
  CompileInput,
  CompileResult,
  CompileSymbolInput,
  CompileSymbolSource,
  CompileSymbolResult,
  CompileSvgSymbolInput,
  CompileSvgSource
} from "./pipeline.js";

export { compileSvgSymbol, compileSymbol } from "./pipeline.js";

export {
  DEFAULT_COMPILER_CONFIG,
  mergeCompilerConfig,
  resolveCompilerConfig
} from "./config/index.js";

export {
  classifySourceSvgAst,
  classifySourceSvgAstWithDiagnostics,
  inferSymbolWeight
} from "./classifier/index.js";

export type {
  SemanticClassificationResult,
  SymbolWeightInferenceResult
} from "./classifier/index.js";

export {
  compileDuotone,
  compileFill,
  compileOutline,
  compileRendering
} from "./rendering/index.js";

export { createSymbolIr, createSymbolVariant } from "./ir/index.js";

export {
  createPaperGeometryMaterializer,
  lowerPathAst,
  lowerRenderingGeometry,
  NoopGeometryProcessor
} from "./geometry/index.js";

export { parsePathData, parseSvgSource } from "./parser/index.js";

export { renderSvg } from "./renderers/svg/index.js";

export type { SvgRenderOptions } from "./renderers/svg/index.js";

export { generateFigmaSvgSet, generateSymbolSvgFiles } from "./generator/index.js";

export type {
  FigmaSvgStyle,
  GeneratedFigmaSvg,
  GenerateFigmaSvgSetInput,
  GenerateFigmaSvgSetResult,
  GenerateSymbolSvgFilesOptions
} from "./generator/index.js";

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
  ResolvedSemanticIdConfig,
  ResolvedSemanticIdRolesConfig,
  ResolvedStrokeConfig,
  RenderingConfigInput,
  SemanticIdConfigInput,
  SemanticIdRolesConfigInput,
  StrokeConfigInput,
  StrokeLinecap,
  StrokeLinejoin,
  SymbolStyleProfileConfigInput,
  SymbolStyleProfilesConfigInput,
  SymbolWeightProfileConfigInput,
  SymbolWeightProfilesConfigInput,
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
  SourceStrokeLinecap,
  SourceStrokeLinejoin,
  SourceSvgAst,
  SemanticPathNode,
  SemanticColorRole,
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
  PaperGeometryMaterializerOptions,
  GeometryLoweringResult,
  GeometryCloseCommand,
  GeometryCubicCommand,
  GeometryLineCommand,
  GeometryMoveCommand,
  GeometryPath,
  GeometryPathCommand,
  GeometryPoint,
  GeometryProcessor,
  GeometryRegion,
  LoweredGeometryPath
} from "./geometry/index.js";

export type {
  CreateSymbolIrInput,
  MaterializedVariantGeometry,
  SymbolIrVariantInput
} from "./ir/index.js";
