import {
  SYMBOL_WEIGHT_ORDER,
  SymbolWeight,
  type SymbolBounds
} from "@claralight-design/symbol-kit-core";

import type { SemanticPathNode } from "../ast/index.js";
import { classifySourceSvgAstWithDiagnostics, inferSymbolWeight } from "../classifier/index.js";
import {
  resolveCompilerConfig,
  type CompilerConfigInput,
  type SymbolOutputMode
} from "../config/index.js";
import type { CompileDiagnostic } from "../diagnostics.js";
import {
  initializeGeometry,
  materializePath,
  serializePath,
  subtractPathItem,
  unitePathItems
} from "../geometry/paper-path.js";
import { normalizeSourceSvgAst } from "../normalize/index.js";
import { parseSvgSource } from "../parser/index.js";

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

export function generateFigmaSvgSet(input: GenerateFigmaSvgSetInput): GenerateFigmaSvgSetResult {
  const config = resolveCompilerConfig({ project: input.config });
  const source = normalizeSourceSvgAst(parseSvgSource({ name: input.name, svg: input.svg }));
  const classification = classifySourceSvgAstWithDiagnostics(source, config);
  const weightResult = inferSymbolWeight(source, config);
  const diagnostics = [...classification.diagnostics, ...weightResult.diagnostics];

  if (
    diagnostics.some((diagnostic) => diagnostic.severity === "error") ||
    weightResult.weight === undefined
  ) {
    return { files: [], diagnostics };
  }

  const sourceProfile = config.weights[weightResult.weight];
  if (sourceProfile === undefined) {
    return {
      files: [],
      diagnostics: [
        ...diagnostics,
        {
          severity: "error",
          code: "generator.source-weight-profile-missing",
          message: `Source weight profile is missing: ${weightResult.weight}.`
        }
      ]
    };
  }

  const files = SYMBOL_WEIGHT_ORDER.flatMap((weight) => {
    const profile = config.weights[weight];
    if (profile === undefined) {
      return [];
    }

    return config.modes.map((mode) => {
      const style = modeToStyle(mode);
      return {
        weight,
        style,
        fileName: `${formatWeightName(weight)}/${formatStyleName(style)}.svg`,
        svg: renderFigmaVariant({
          viewBox: classification.semantic.viewBox,
          paths: classification.semantic.paths,
          mode,
          targetStrokeWidth: profile.strokeWidth,
          sourceStrokeWidth: sourceProfile.strokeWidth,
          duotoneFillOpacity: config.rendering.duotoneFillOpacity
        })
      } satisfies GeneratedFigmaSvg;
    });
  });

  return { files, diagnostics };
}

interface RenderFigmaVariantInput {
  readonly viewBox: SymbolBounds;
  readonly paths: readonly SemanticPathNode[];
  readonly mode: SymbolOutputMode;
  readonly targetStrokeWidth: number;
  readonly sourceStrokeWidth: number;
  readonly duotoneFillOpacity: number;
}

function renderFigmaVariant(input: RenderFigmaVariantInput): string {
  initializeGeometry(input.viewBox.width, input.viewBox.height);
  const accentPaths = input.paths.filter((path) => isAccentPath(path, input.mode));
  const sharedPaths = input.paths.filter((path) => path.role === "primary");
  const normalLinePaths = input.paths.filter((path) => path.role === "line");
  const duotoneLinePaths = input.paths.filter((path) => path.role === "duotone-line");
  const reversePaths = input.paths.filter(
    (path) => path.role === "cutout" || path.colorRole === "reverse"
  );
  const layers: string[] = [];

  if (input.mode === "fill") {
    const foregroundPaths = [...accentPaths, ...sharedPaths, ...duotoneLinePaths].filter(
      (path) => path.colorRole !== "reverse"
    );
    const foreground = materializePaths(foregroundPaths, input, true);
    const reverse = materializePaths(reversePaths, input, false);

    if (foreground !== undefined) {
      const result = reverse === undefined ? foreground : subtractPathItem(foreground, reverse);
      layers.push(renderGeometryLayer("foreground", result));
    }
  } else if (input.mode !== "outline" && accentPaths.length > 0) {
    layers.push(renderLayer("accent", accentPaths, input, false, input.duotoneFillOpacity));
  }

  const primaryPaths =
    input.mode === "outline" ? [...sharedPaths, ...normalLinePaths] : sharedPaths;
  if (input.mode !== "fill" && primaryPaths.length > 0) {
    layers.push(renderLayer("primary", primaryPaths, input, true));
  }

  if (input.mode === "duotone" && duotoneLinePaths.length > 0) {
    layers.push(renderLayer("duotone-line", duotoneLinePaths, input, true));
  }

  const viewBox = [input.viewBox.x, input.viewBox.y, input.viewBox.width, input.viewBox.height]
    .map(formatNumber)
    .join(" ");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="none">${layers.join("")}</svg>`;
}

function renderLayer(
  role: "primary" | "accent" | "duotone-line",
  paths: readonly SemanticPathNode[],
  input: RenderFigmaVariantInput,
  thickenFilledPaths: boolean,
  opacity?: number
): string {
  const opacityAttribute = opacity === undefined ? "" : ` opacity="${formatNumber(opacity)}"`;
  const content = materializePathList(paths, input, thickenFilledPaths)
    .map(renderGeometryPath)
    .join("");

  return `<g data-symbol-layer="${role}"${opacityAttribute}>${content}</g>`;
}

function isAccentPath(path: SemanticPathNode, mode: SymbolOutputMode): boolean {
  if (path.role === "accent" || path.role === "secondary") {
    return true;
  }
  if (mode === "duotone") {
    return path.role === "background-no-fill";
  }
  if (mode === "fill") {
    return path.role === "background-no-duotone";
  }
  return false;
}

function materializePaths(
  paths: readonly SemanticPathNode[],
  input: RenderFigmaVariantInput,
  thickenFilledPaths: boolean
): paper.PathItem | undefined {
  return unitePathItems(materializePathList(paths, input, thickenFilledPaths));
}

function materializePathList(
  paths: readonly SemanticPathNode[],
  input: RenderFigmaVariantInput,
  thickenFilledPaths: boolean
): paper.PathItem[] {
  return paths.flatMap((path) => {
    const geometry = materializePath({
      d: path.d,
      paint: path.paint,
      strokeWidth: input.targetStrokeWidth,
      ...(thickenFilledPaths && input.targetStrokeWidth > input.sourceStrokeWidth
        ? { filledStrokeWidth: input.targetStrokeWidth - input.sourceStrokeWidth }
        : {})
    });
    return geometry === undefined ? [] : [geometry];
  });
}

function renderGeometryLayer(role: "foreground", geometry: paper.PathItem): string {
  return `<g data-symbol-layer="${role}">${renderGeometryPath(geometry)}</g>`;
}

function renderGeometryPath(geometry: paper.PathItem): string {
  const d = escapeAttribute(serializePath(geometry));
  geometry.remove();
  return `<path d="${d}" fill="currentColor" fill-rule="evenodd"/>`;
}

function modeToStyle(mode: SymbolOutputMode): FigmaSvgStyle {
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

function escapeAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function formatNumber(value: number): string {
  const rounded = Math.round(value * 1_000_000) / 1_000_000;
  return Object.is(rounded, -0) ? "0" : String(rounded);
}
