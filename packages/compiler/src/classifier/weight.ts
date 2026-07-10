import { isSymbolWeight, type SymbolWeight } from "@claralight-design/symbol-kit-core";

import type { SourceSvgAst } from "../ast/index.js";
import type { ResolvedCompilerConfig } from "../config/index.js";
import type { CompileDiagnostic } from "../diagnostics.js";

const DEFAULT_STROKE_WIDTH_TOLERANCE = 0.001;

export interface SymbolWeightInferenceResult {
  readonly weight?: SymbolWeight;
  readonly diagnostics: readonly CompileDiagnostic[];
}

export function inferSymbolWeight(
  source: SourceSvgAst,
  config: ResolvedCompilerConfig
): SymbolWeightInferenceResult {
  const profiles = Object.entries(config.weights);

  if (profiles.length === 0) {
    return failure(
      "weight.profiles-missing",
      "Weight inference requires at least one configured weight profile."
    );
  }

  const strokeWidths = source.paths.flatMap((path) =>
    isActiveStroke(path.paint.stroke) && path.paint.strokeWidth !== undefined
      ? [path.paint.strokeWidth]
      : []
  );

  if (strokeWidths.length === 0) {
    return failure(
      "weight.stroke-width-missing",
      "Weight inference requires at least one active stroke with stroke-width."
    );
  }

  const sourceStrokeWidth = strokeWidths[0];
  if (sourceStrokeWidth === undefined) {
    return failure(
      "weight.stroke-width-missing",
      "Weight inference requires at least one active stroke with stroke-width."
    );
  }

  if (
    strokeWidths.some(
      (strokeWidth) => Math.abs(strokeWidth - sourceStrokeWidth) > DEFAULT_STROKE_WIDTH_TOLERANCE
    )
  ) {
    return failure(
      "weight.stroke-width-inconsistent",
      `Weight inference found inconsistent stroke widths: ${[...new Set(strokeWidths)].join(", ")}.`
    );
  }

  const matches = profiles.flatMap(([name, profile]) => {
    const tolerance = profile.tolerance ?? DEFAULT_STROKE_WIDTH_TOLERANCE;
    return Math.abs(sourceStrokeWidth - profile.strokeWidth) <= tolerance && isSymbolWeight(name)
      ? [name]
      : [];
  });

  if (matches.length === 0) {
    return failure(
      "weight.unmatched-stroke-width",
      `Stroke width ${String(sourceStrokeWidth)} does not match any configured weight profile.`
    );
  }

  if (matches.length > 1) {
    return failure(
      "weight.ambiguous-stroke-width",
      `Stroke width ${String(sourceStrokeWidth)} matches multiple weight profiles: ${matches.join(", ")}.`
    );
  }

  const weight = matches[0];
  return weight === undefined
    ? failure("weight.unmatched-stroke-width", "Weight inference did not resolve a weight.")
    : {
        weight,
        diagnostics: []
      };
}

function isActiveStroke(stroke: string | undefined): boolean {
  return stroke !== undefined && stroke.trim().toLowerCase() !== "none";
}

function failure(code: string, message: string): SymbolWeightInferenceResult {
  return {
    diagnostics: [
      {
        severity: "error",
        code,
        message
      }
    ]
  };
}
