import { describe, expect, it } from "vitest";

import { SYMBOL_WEIGHT_ORDER, SymbolWeight, isSymbolWeight, parseSymbolWeight } from "../index.js";

describe("SymbolWeight", () => {
  it("keeps the first version weight order stable", () => {
    expect(SYMBOL_WEIGHT_ORDER).toEqual([
      SymbolWeight.Ultralight,
      SymbolWeight.Thin,
      SymbolWeight.Light,
      SymbolWeight.Regular,
      SymbolWeight.Medium,
      SymbolWeight.Semibold,
      SymbolWeight.Bold,
      SymbolWeight.Heavy,
      SymbolWeight.Black
    ]);
  });

  it("accepts only named weights", () => {
    expect(isSymbolWeight("regular")).toBe(true);
    expect(isSymbolWeight("400")).toBe(false);
  });

  it("parses a valid weight", () => {
    expect(parseSymbolWeight("black")).toBe(SymbolWeight.Black);
  });

  it("rejects an invalid weight", () => {
    expect(() => parseSymbolWeight("900")).toThrow(TypeError);
  });
});
