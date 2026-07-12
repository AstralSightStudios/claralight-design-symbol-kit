export {
  SymbolWeight,
  SYMBOL_WEIGHT_ORDER,
  isSymbolWeight,
  parseSymbolWeight,
  type SymbolWeightName
} from "./weight.js";

export {
  SYMBOL_IR_SCHEMA_VERSION,
  type SymbolAccentLayer,
  type SymbolBounds,
  type SymbolCloseCommand,
  type SymbolCubicCommand,
  type SymbolDuotoneVariant,
  type SymbolFillVariant,
  type SymbolGeometry,
  type SymbolIr,
  type SymbolLayer,
  type SymbolLayerRole,
  type SymbolLineCommand,
  type SymbolMoveCommand,
  type SymbolOutlineVariant,
  type SymbolPath,
  type SymbolPathCommand,
  type SymbolPoint,
  type SymbolPrimaryLayer,
  type SymbolVariant,
  type SymbolVariantKind,
  type SymbolViewBox
} from "./symbol-ir.js";

export { assertNever } from "./utils/assert-never.js";

export {
  createSymbolRenderModel,
  findSymbolVariant,
  renderSvg,
  serializeSymbolPath
} from "./rendering.js";

export type {
  SvgRenderOptions,
  SymbolRenderLayer,
  SymbolRenderModel,
  SymbolRenderOptions,
  SymbolRenderPath
} from "./rendering.js";

export {
  COMPILED_SYMBOL_FORMAT,
  COMPILED_SYMBOL_VERSION,
  createCompiledSymbol,
  isCompiledSymbol
} from "./compiled-symbol.js";

export type {
  CompiledSymbol,
  CompiledSymbolLayer,
  CompiledSymbolVariant,
  RenderableSymbol
} from "./compiled-symbol.js";
