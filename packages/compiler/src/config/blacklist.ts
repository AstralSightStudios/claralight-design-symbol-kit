import type { SymbolWeightName } from "@claralight-design/symbol-kit-core";

import type {
  ResolvedSymbolBlacklistConfig,
  SymbolOutputMode,
  SymbolVariantCombination
} from "./schema.js";

export function isSymbolVariantBlacklisted(
  blacklist: ResolvedSymbolBlacklistConfig,
  name: string,
  weight: SymbolWeightName,
  mode: SymbolOutputMode
): boolean {
  return (
    hasCombination(blacklist.combinations, weight, mode) ||
    hasCombination(blacklist.icons[name] ?? [], weight, mode)
  );
}

function hasCombination(
  combinations: readonly SymbolVariantCombination[],
  weight: SymbolWeightName,
  mode: SymbolOutputMode
): boolean {
  return combinations.some(
    (combination) => combination.weight === weight && combination.mode === mode
  );
}
