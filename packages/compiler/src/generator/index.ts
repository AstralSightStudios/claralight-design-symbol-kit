import {
  SYMBOL_WEIGHT_ORDER,
  SymbolWeight,
  createCompiledSymbol,
  type SymbolIr
} from "@claralight-design/symbol-kit-core";

import { resolveCompilerConfig, type CompilerConfigInput } from "../config/index.js";
import type { CompileDiagnostic } from "../diagnostics.js";
import { compileSvgSymbol } from "../pipeline.js";
import { renderSvg } from "../renderers/svg/index.js";

export type FigmaSvgStyle = "normal" | "fill" | "duotone";

export interface GenerateFigmaSvgSetInput {
  readonly name: string;
  readonly svg: string;
  readonly config: CompilerConfigInput;
}

export interface GeneratedFigmaSvg {
  readonly weight: SymbolWeight;
  readonly style: FigmaSvgStyle;
  readonly fileName: string;
  readonly svg: string;
}

export interface GenerateFigmaSvgSetResult {
  readonly files: readonly GeneratedFigmaSvg[];
  readonly diagnostics: readonly CompileDiagnostic[];
}

export interface GenerateSymbolSvgFilesOptions {
  /**
   * Opacity applied to duotone accent layers. Pass
   * `config.rendering.duotoneFillOpacity` for canonical Figma output;
   * when omitted, accent layers are emitted without an opacity attribute.
   */
  readonly accentOpacity?: number;
}

export function generateFigmaSvgSet(input: GenerateFigmaSvgSetInput): GenerateFigmaSvgSetResult {
  const config = resolveCompilerConfig({ project: input.config });
  const targetWeights = SYMBOL_WEIGHT_ORDER.filter(
    (weight) => config.weights[weight] !== undefined
  );

  if (targetWeights.length === 0) {
    return {
      files: [],
      diagnostics: [
        {
          severity: "error",
          code: "generator.weights-missing",
          message: "No weight profiles are configured."
        }
      ]
    };
  }

  const result = compileSvgSymbol({
    name: input.name,
    svg: input.svg,
    config: input.config,
    targetWeights
  });

  if (result.symbol === undefined) {
    return { files: [], diagnostics: result.diagnostics };
  }

  return {
    files: generateSymbolSvgFiles(result.symbol, {
      accentOpacity: config.rendering.duotoneFillOpacity
    }),
    diagnostics: result.diagnostics
  };
}

export function generateSymbolSvgFiles(
  symbol: SymbolIr,
  options: GenerateSymbolSvgFilesOptions = {}
): readonly GeneratedFigmaSvg[] {
  const compiled = createCompiledSymbol(symbol);

  return compiled.variants.map((variant) => {
    const style = modeToStyle(variant.kind);
    return {
      weight: variant.weight,
      style,
      fileName: `${formatWeightName(variant.weight)}/${formatStyleName(style)}.svg`,
      svg: renderSvg(compiled, {
        kind: variant.kind,
        weight: variant.weight,
        ...(options.accentOpacity === undefined ? {} : { accentOpacity: options.accentOpacity })
      })
    };
  });
}

function modeToStyle(mode: "outline" | "fill" | "duotone"): FigmaSvgStyle {
  return mode === "outline" ? "normal" : mode;
}

function formatWeightName(weight: SymbolWeight): string {
  switch (weight) {
    case SymbolWeight.Ultralight:
      return "UltraLight";
    case SymbolWeight.Semibold:
      return "SemiBold";
    default:
      return `${weight.charAt(0).toUpperCase()}${weight.slice(1)}`;
  }
}

function formatStyleName(style: FigmaSvgStyle): string {
  return `${style.charAt(0).toUpperCase()}${style.slice(1)}`;
}
