import { readFileSync } from "node:fs";

import { SymbolWeight } from "@claralight-design/symbol-kit-core";
import { describe, expect, it } from "vitest";

import { generateFigmaSvgSet, type CompilerConfigInput } from "../index.js";

const creditCardSvg = readFileSync(
  new URL("../../../../test/CreditCard.svg", import.meta.url),
  "utf8"
);

const config: CompilerConfigInput = {
  colors: {
    foreground: ["#000000"]
  },
  styles: {
    duotone: {
      accentOpacity: 0.2
    }
  },
  weights: {
    ultralight: { strokeWidth: 0.6 },
    thin: { strokeWidth: 1.2 },
    light: { strokeWidth: 1.8 },
    regular: { strokeWidth: 2.2 },
    medium: { strokeWidth: 2.8 },
    semibold: { strokeWidth: 3.2 },
    bold: { strokeWidth: 3.8 },
    heavy: { strokeWidth: 4.2 }
  },
  modes: ["outline", "fill", "duotone"]
};

describe("generateFigmaSvgSet", () => {
  it("generates every configured CreditCard weight and style", () => {
    const result = generateFigmaSvgSet({
      name: "CreditCard",
      svg: creditCardSvg,
      config
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.files).toHaveLength(24);
    expect(result.files.map((file) => file.fileName)).toContain("UltraLight/Normal.svg");
    expect(result.files.map((file) => file.fileName)).toContain("Heavy/Duotone.svg");
  });

  it("maps the three style modes to the expected layers and opacity", () => {
    const result = generateFigmaSvgSet({
      name: "CreditCard",
      svg: creditCardSvg,
      config
    });
    const normal = result.files.find(
      (file) => file.weight === SymbolWeight.Ultralight && file.style === "normal"
    );
    const fill = result.files.find(
      (file) => file.weight === SymbolWeight.Ultralight && file.style === "fill"
    );
    const duotone = result.files.find(
      (file) => file.weight === SymbolWeight.Ultralight && file.style === "duotone"
    );

    expect(normal?.svg).not.toContain('data-symbol-layer="accent"');
    expect(fill?.svg).toContain('data-symbol-layer="accent" opacity="1"');
    expect(duotone?.svg).toContain('data-symbol-layer="accent" opacity="0.2"');
    expect(duotone?.svg.indexOf('data-symbol-layer="accent"')).toBeLessThan(
      duotone?.svg.indexOf('data-symbol-layer="primary"') ?? 0
    );
  });

  it("uses token stroke widths while preserving Figma path data", () => {
    const result = generateFigmaSvgSet({
      name: "CreditCard",
      svg: creditCardSvg,
      config
    });
    const ultraLight = result.files.find(
      (file) => file.weight === SymbolWeight.Ultralight && file.style === "normal"
    );
    const heavy = result.files.find(
      (file) => file.weight === SymbolWeight.Heavy && file.style === "normal"
    );

    expect(ultraLight?.svg).toContain('d="M3 12H29"');
    expect(ultraLight?.svg).toContain('stroke-width="0.6"');
    expect(heavy?.svg).toContain('stroke-width="4.2"');
    expect(heavy?.svg).toContain('stroke-width="3.6"');
    expect(heavy?.svg).toContain('stroke-linecap="round"');
  });

  it("returns diagnostics instead of partial files for a nonconforming source", () => {
    const result = generateFigmaSvgSet({
      name: "CreditCard",
      svg: creditCardSvg.replace('opacity="0.2"', 'opacity="0.3"'),
      config
    });

    expect(result.files).toEqual([]);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "semantic.opacity-mismatch", severity: "error" })
    );
  });
});
