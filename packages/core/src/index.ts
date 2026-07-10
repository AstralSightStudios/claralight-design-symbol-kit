export {
  SymbolWeight,
  SYMBOL_WEIGHT_ORDER,
  isSymbolWeight,
  parseSymbolWeight,
  type SymbolWeightName
} from "./weight.js";

export {
  SYMBOL_IR_SCHEMA_VERSION,
  type SymbolBounds,
  type SymbolCloseCommand,
  type SymbolCurveToCommand,
  type SymbolIr,
  type SymbolIrMetadata,
  type SymbolLineToCommand,
  type SymbolMoveToCommand,
  type SymbolPath,
  type SymbolPathCommand,
  type SymbolPoint,
  type SymbolVariant,
  type SymbolViewBox
} from "./symbol-ir.js";

export { assertNever } from "./utils/assert-never.js";
