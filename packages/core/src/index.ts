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
