import { readFileSync } from "node:fs";

import { SymbolWeight } from "@claralight-design/symbol-kit-core";
import { describe, expect, it } from "vitest";

import { generateFigmaSvgSet, type CompilerConfigInput } from "../index.js";

const creditCardSvg = readFileSync(
  new URL("../../../../test/CreditCard.svg", import.meta.url),
  "utf8"
);
const arrowSquareOutSvg = readFileSync(
  new URL("../../../../test/ArrowSquareOut.svg", import.meta.url),
  "utf8"
);
const arrowCircleRightSvg = readFileSync(
  new URL("../../../../test/ArrowCircleRight.svg", import.meta.url),
  "utf8"
);
const arrowLeftSvg = readFileSync(
  new URL("../../../../test/ArrowLeft.svg", import.meta.url),
  "utf8"
);

const config: CompilerConfigInput = {
  colors: {
    foreground: ["#000000"]
  },
  styles: {
    build: {
      color: "#000000",
      reverse: "#FFFFFF",
      lineOpacity: 0.1,
      duotoneLineOpacity: 0.6,
      backgroundOpacity: 0.8,
      noFillBackgroundOpacity: 0.1,
      noDuotoneBackgroundOpacity: 0.9
    },
    normal: {
      color: "#000000",
      reverse: "#000000",
      lineOpacity: 1,
      duotoneLineOpacity: 0,
      backgroundOpacity: 0,
      noFillBackgroundOpacity: 0,
      noDuotoneBackgroundOpacity: 0
    },
    duotone: {
      color: "#000000",
      reverse: "#000000",
      lineOpacity: 0,
      duotoneLineOpacity: 0.7,
      backgroundOpacity: 0.2,
      noFillBackgroundOpacity: 0.3,
      noDuotoneBackgroundOpacity: 0
    },
    fill: {
      color: "#000000",
      reverse: "#FFFFFF",
      lineOpacity: 0,
      duotoneLineOpacity: 0.6,
      backgroundOpacity: 0.8,
      noFillBackgroundOpacity: 0,
      noDuotoneBackgroundOpacity: 0.9
    }
  },
  weights: {
    ultralight: { strokeWidth: 0.6 },
    thin: { strokeWidth: 1.2 },
    light: { strokeWidth: 1.8 },
    regular: { strokeWidth: 2.2 },
    medium: { strokeWidth: 2.8 }
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
    expect(result.files).toHaveLength(15);
    expect(result.files.map((file) => file.fileName)).toContain("UltraLight/Normal.svg");
    expect(result.files.map((file) => file.fileName)).toContain("Medium/Duotone.svg");
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
    const medium = result.files.find(
      (file) => file.weight === SymbolWeight.Medium && file.style === "normal"
    );

    expect(ultraLight?.svg).toContain('d="M3 12H29"');
    expect(ultraLight?.svg).toContain('stroke-width="0.6"');
    expect(medium?.svg).toContain('stroke-width="2.8"');
    expect(medium?.svg).toContain('stroke-width="2.2"');
    expect(medium?.svg).toContain('stroke-linecap="round"');
  });

  it.each([0.2, 0.8])("normalizes source background opacity %s in generated styles", (opacity) => {
    const result = generateFigmaSvgSet({
      name: "CreditCard",
      svg: creditCardSvg.replace('opacity="0.2"', `opacity="${String(opacity)}"`),
      config
    });
    const duotone = result.files.find(
      (file) => file.weight === SymbolWeight.Ultralight && file.style === "duotone"
    );
    const fill = result.files.find(
      (file) => file.weight === SymbolWeight.Ultralight && file.style === "fill"
    );

    expect(result.diagnostics).toEqual([]);
    expect(duotone?.svg).toContain('data-symbol-layer="accent" opacity="0.2"');
    expect(fill?.svg).toContain('data-symbol-layer="accent" opacity="1"');
  });

  it("keeps NoFill backgrounds out of Fill output", () => {
    const result = generateFigmaSvgSet({
      name: "CreditCard",
      svg: creditCardSvg.replace('opacity="0.2"', 'opacity="0.3"'),
      config
    });

    expect(findUltraLightStyle(result.files, "duotone")).toContain(
      'data-symbol-layer="accent" opacity="0.2"'
    );
    expect(findUltraLightStyle(result.files, "fill")).not.toContain('data-symbol-layer="accent"');
  });

  it("keeps NoDuo backgrounds out of Duotone output", () => {
    const result = generateFigmaSvgSet({
      name: "CreditCard",
      svg: creditCardSvg.replace('opacity="0.2"', 'opacity="0.9"'),
      config
    });

    expect(findUltraLightStyle(result.files, "duotone")).not.toContain(
      'data-symbol-layer="accent"'
    );
    expect(findUltraLightStyle(result.files, "fill")).toContain(
      'data-symbol-layer="accent" opacity="1"'
    );
  });

  it("uses Build IDs and opacity fallback for ArrowSquareOut", () => {
    const result = generateFigmaSvgSet({
      name: "ArrowSquareOut",
      svg: arrowSquareOutSvg,
      config
    });
    const normal = findUltraLightStyle(result.files, "normal");
    const duotone = findUltraLightStyle(result.files, "duotone");
    const fill = findUltraLightStyle(result.files, "fill");

    expect(result.diagnostics).toEqual([]);
    expect(normal).not.toContain('data-symbol-layer="accent"');
    expect(duotone).toContain('data-symbol-layer="accent" opacity="0.2"');
    expect(fill).not.toContain('data-symbol-layer="accent"');
  });

  it("renders Reverse paths with the Fill color", () => {
    const result = generateFigmaSvgSet({
      name: "ArrowCircleRight",
      svg: arrowCircleRightSvg,
      config
    });
    const normal = findUltraLightStyle(result.files, "normal");
    const duotone = findUltraLightStyle(result.files, "duotone");
    const fill = findUltraLightStyle(result.files, "fill");

    expect(result.diagnostics).toEqual([]);
    expect(normal).toContain('stroke="currentColor"');
    expect(duotone).toContain('data-symbol-layer="accent" opacity="0.2"');
    expect(fill).toContain('data-symbol-layer="accent" opacity="1"');
    expect(fill).toContain('stroke="#FFFFFF"');
  });

  it("switches normal-only and duotone line layers by style", () => {
    const result = generateFigmaSvgSet({
      name: "ArrowLeft",
      svg: arrowLeftSvg,
      config
    });
    const normal = findUltraLightStyle(result.files, "normal");
    const duotone = findUltraLightStyle(result.files, "duotone");
    const fill = findUltraLightStyle(result.files, "fill");

    expect(result.diagnostics).toEqual([]);
    expect(normal).not.toContain('data-symbol-layer="duotone-line"');
    expect(duotone).toContain('data-symbol-layer="duotone-line"');
    expect(fill).toContain('data-symbol-layer="duotone-line"');
    expect(duotone).not.toMatch(/data-symbol-layer="duotone-line"[^>]*opacity=/u);
    expect(fill).not.toMatch(/data-symbol-layer="duotone-line"[^>]*opacity=/u);
  });

  it("limits generated opacity attributes to canonical output values", () => {
    const result = generateFigmaSvgSet({
      name: "ArrowLeft",
      svg: arrowLeftSvg,
      config
    });
    const opacityValues = result.files.flatMap((file) =>
      [...file.svg.matchAll(/\sopacity="([^"]+)"/gu)].map((match) => match[1])
    );

    expect(result.diagnostics).toEqual([]);
    expect(new Set(opacityValues)).toEqual(new Set(["0.2", "1"]));
  });

  it("returns diagnostics instead of partial files for a nonconforming source", () => {
    const result = generateFigmaSvgSet({
      name: "CreditCard",
      svg: creditCardSvg.replace('opacity="0.2"', 'opacity="0.4"'),
      config
    });

    expect(result.files).toEqual([]);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "semantic.opacity-mismatch", severity: "error" })
    );
  });
});

function findUltraLightStyle(
  files: readonly { readonly weight: SymbolWeight; readonly style: string; readonly svg: string }[],
  style: string
): string {
  return (
    files.find((file) => file.weight === SymbolWeight.Ultralight && file.style === style)?.svg ?? ""
  );
}
