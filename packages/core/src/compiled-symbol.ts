import type { SymbolBounds, SymbolIr, SymbolLayerRole, SymbolVariantKind } from "./symbol-ir.js";
import { serializeSymbolPath } from "./rendering.js";
import type { SymbolWeight } from "./weight.js";

export const COMPILED_SYMBOL_FORMAT = "claralight-symbol";
export const COMPILED_SYMBOL_VERSION = 1;

export interface CompiledSymbolLayer {
  readonly role: SymbolLayerRole;
  readonly paths: readonly string[];
}

export interface CompiledSymbolVariant {
  readonly kind: SymbolVariantKind;
  readonly weight: SymbolWeight;
  readonly layers: readonly CompiledSymbolLayer[];
}

export interface CompiledSymbol {
  readonly format: typeof COMPILED_SYMBOL_FORMAT;
  readonly version: typeof COMPILED_SYMBOL_VERSION;
  readonly name: string;
  readonly viewBox: SymbolBounds;
  readonly variants: readonly CompiledSymbolVariant[];
}

export type RenderableSymbol = SymbolIr | CompiledSymbol;

export function createCompiledSymbol(symbol: SymbolIr): CompiledSymbol {
  return {
    format: COMPILED_SYMBOL_FORMAT,
    version: COMPILED_SYMBOL_VERSION,
    name: symbol.name,
    viewBox: { ...symbol.viewBox },
    variants: symbol.variants.map((variant) => ({
      kind: variant.kind,
      weight: variant.weight,
      layers: variant.layers.map((layer) => ({
        role: layer.role,
        paths: layer.geometry.paths.map((path) => serializeSymbolPath(path.commands))
      }))
    }))
  };
}

export function isCompiledSymbol(symbol: RenderableSymbol): symbol is CompiledSymbol {
  return "format" in symbol;
}
