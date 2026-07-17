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
const caretCircleDownSvg = readFileSync(
  new URL("../../../../test/CaretCircleDown.svg", import.meta.url),
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
      noFillLineOpacity: 0.5,
      noDuotoneLineOpacity: 0.4,
      onlyFillLineOpacity: 0.2,
      onlyDuotoneLineOpacity: 0.7,
      backgroundOpacity: 0.8,
      noFillBackgroundOpacity: 0.1,
      noDuotoneBackgroundOpacity: 0.9
    },
    normal: {
      color: "#000000",
      reverse: "#000000",
      lineOpacity: 1,
      duotoneLineOpacity: 0,
      noFillLineOpacity: 1,
      noDuotoneLineOpacity: 1,
      onlyFillLineOpacity: 0,
      onlyDuotoneLineOpacity: 0,
      backgroundOpacity: 0,
      noFillBackgroundOpacity: 0,
      noDuotoneBackgroundOpacity: 0
    },
    duotone: {
      color: "#000000",
      reverse: "#000000",
      lineOpacity: 0,
      duotoneLineOpacity: 0.7,
      noFillLineOpacity: 1,
      noDuotoneLineOpacity: 0,
      onlyFillLineOpacity: 0,
      onlyDuotoneLineOpacity: 1,
      backgroundOpacity: 0.2,
      noFillBackgroundOpacity: 0.3,
      noDuotoneBackgroundOpacity: 0
    },
    fill: {
      color: "#000000",
      reverse: "#FFFFFF",
      lineOpacity: 0,
      duotoneLineOpacity: 0.6,
      noFillLineOpacity: 0,
      noDuotoneLineOpacity: 1,
      onlyFillLineOpacity: 1,
      onlyDuotoneLineOpacity: 0,
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
    expect(fill?.svg).toContain('data-symbol-layer="primary"');
    expect(fill?.svg).not.toContain('data-symbol-layer="accent"');
    expect(duotone?.svg).toContain('data-symbol-layer="accent" opacity="0.2"');
    expect(duotone?.svg.indexOf('data-symbol-layer="accent"')).toBeLessThan(
      duotone?.svg.indexOf('data-symbol-layer="primary"') ?? 0
    );
  });

  it("converts token stroke widths into filled outline geometry", () => {
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

    expect(ultraLight?.svg).toContain('fill="currentColor"');
    expect(ultraLight?.svg).not.toContain("stroke=");
    expect(medium?.svg).not.toContain("stroke=");
    expect(medium?.svg).not.toEqual(ultraLight?.svg);
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
    expect(fill?.svg).toContain('data-symbol-layer="primary"');
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
    expect(findUltraLightStyle(result.files, "fill")).toContain('data-symbol-layer="primary"');
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

  it("subtracts Reverse paths from the merged Fill foreground", () => {
    const result = generateFigmaSvgSet({
      name: "ArrowCircleRight",
      svg: arrowCircleRightSvg,
      config
    });
    const normal = findUltraLightStyle(result.files, "normal");
    const duotone = findUltraLightStyle(result.files, "duotone");
    const fill = findUltraLightStyle(result.files, "fill");

    expect(result.diagnostics).toEqual([]);
    expect(normal).not.toContain("stroke=");
    expect(duotone).toContain('data-symbol-layer="accent" opacity="0.2"');
    expect(fill).toContain('data-symbol-layer="primary"');
    expect(fill).toContain('fill-rule="evenodd"');
    expect(fill).not.toContain('data-symbol-layer="reverse"');
    expect(fill).not.toContain("#FFFFFF");
    expect(fill.match(/<path\b/gu)).toHaveLength(1);
    expect(fill.match(/M/gu)?.length).toBeGreaterThan(1);
  });

  it("merges normal-only and duotone line geometry into the primary layer by style", () => {
    const result = generateFigmaSvgSet({
      name: "ArrowLeft",
      svg: arrowLeftSvg,
      config
    });
    const normal = findUltraLightStyle(result.files, "normal");
    const duotone = findUltraLightStyle(result.files, "duotone");
    const fill = findUltraLightStyle(result.files, "fill");

    expect(result.diagnostics).toEqual([]);
    for (const svg of [normal, duotone, fill]) {
      expect(svg).not.toContain('data-symbol-layer="duotone-line"');
    }
    // Normal primary: arrow head + shaft + normal-only line (3 paths).
    expect(normal.match(/<path\b/gu)).toHaveLength(3);
    // Duotone: accent triangle + primary with duotone line merged in (1 + 3 paths).
    expect(duotone.match(/<path\b/gu)).toHaveLength(4);
    expect(duotone).toContain('data-symbol-layer="accent" opacity="0.2"');
    expect(fill).toContain('data-symbol-layer="primary"');
    expect(normal).not.toEqual(duotone);
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
    expect(new Set(opacityValues)).toEqual(new Set(["0.2"]));
  });

  it("keeps reverse cutout strokes in outline and duotone output", () => {
    const result = generateFigmaSvgSet({
      name: "CaretCircleDown",
      svg: caretCircleDownSvg,
      config
    });
    const normal = findUltraLightStyle(result.files, "normal");
    const duotone = findUltraLightStyle(result.files, "duotone");
    const fill = findUltraLightStyle(result.files, "fill");

    expect(result.diagnostics).toEqual([]);
    // The white caret stroke must survive as foreground geometry:
    // ring + caret in outline, accent + ring + caret in duotone.
    expect(normal.match(/<path\b/gu)).toHaveLength(2);
    expect(duotone.match(/<path\b/gu)).toHaveLength(3);
    expect(duotone).toContain('data-symbol-layer="accent" opacity="0.2"');
    // Fill subtracts the caret from the solid disc instead.
    expect(fill.match(/<path\b/gu)).toHaveLength(1);
  });

  it("returns diagnostics instead of partial files for a nonconforming source", () => {
    const result = generateFigmaSvgSet({
      name: "CreditCard",
      svg: creditCardSvg.replace('opacity="0.2"', 'opacity="0.35"'),
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
