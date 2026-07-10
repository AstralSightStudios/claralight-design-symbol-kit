export enum SymbolWeight {
  Ultralight = "ultralight",
  Thin = "thin",
  Light = "light",
  Regular = "regular",
  Medium = "medium",
  Semibold = "semibold",
  Bold = "bold",
  Heavy = "heavy",
  Black = "black"
}

export type SymbolWeightName = `${SymbolWeight}`;

export const SYMBOL_WEIGHT_ORDER: readonly SymbolWeight[] = [
  SymbolWeight.Ultralight,
  SymbolWeight.Thin,
  SymbolWeight.Light,
  SymbolWeight.Regular,
  SymbolWeight.Medium,
  SymbolWeight.Semibold,
  SymbolWeight.Bold,
  SymbolWeight.Heavy,
  SymbolWeight.Black
];

const symbolWeightSet: ReadonlySet<string> = new Set(SYMBOL_WEIGHT_ORDER);

export function isSymbolWeight(value: string): value is SymbolWeight {
  return symbolWeightSet.has(value);
}

export function parseSymbolWeight(value: string): SymbolWeight {
  if (isSymbolWeight(value)) {
    return value;
  }

  throw new TypeError(`Invalid symbol weight: ${value}`);
}
