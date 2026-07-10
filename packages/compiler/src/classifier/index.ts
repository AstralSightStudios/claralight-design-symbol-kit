import type {
  SemanticRole,
  SemanticSvgAst,
  SourcePaint,
  SourceSvgAst
} from "../ast/index.js";
import type { ResolvedCompilerConfig } from "../config/index.js";

export function classifySourceSvgAst(
  source: SourceSvgAst,
  config: ResolvedCompilerConfig
): SemanticSvgAst {
  return {
    name: source.name,
    viewBox: source.viewBox,
    paths: source.paths.map((path) => ({
      ...(path.id === undefined ? {} : { id: path.id }),
      d: path.d,
      paint: path.paint,
      paintOrder: path.paintOrder,
      role: classifyPathRole(path.paint, config)
    }))
  };
}

function classifyPathRole(
  paint: SourcePaint,
  config: ResolvedCompilerConfig
): SemanticRole {
  if (paint.opacity < config.opacity.secondaryThreshold) {
    return "secondary";
  }

  const paintValues = getPaintValues(paint);

  if (paintValues.length === 0) {
    return "unknown";
  }

  if (config.colors.background.length === 0 && config.colors.foreground.length === 0) {
    return "primary";
  }

  if (matchesAnyPaint(paintValues, config.colors.background)) {
    return "cutout";
  }

  if (matchesAnyPaint(paintValues, config.colors.foreground)) {
    return "primary";
  }

  return "unknown";
}

function getPaintValues(paint: SourcePaint): readonly string[] {
  return [paint.fill, paint.stroke].filter(isClassifiablePaint);
}

function isClassifiablePaint(value: string | undefined): value is string {
  return value !== undefined && normalizePaintValue(value) !== "none";
}

function matchesAnyPaint(
  paintValues: readonly string[],
  configuredValues: readonly string[]
): boolean {
  const normalizedConfiguredValues = configuredValues.map(normalizePaintValue);

  return paintValues.some((paintValue) =>
    normalizedConfiguredValues.includes(normalizePaintValue(paintValue))
  );
}

function normalizePaintValue(value: string): string {
  return value.trim().toLowerCase();
}
