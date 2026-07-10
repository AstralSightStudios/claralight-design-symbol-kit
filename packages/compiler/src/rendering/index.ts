import { assertNever, type SymbolBounds } from "@claralight-design/symbol-kit-core";

import type { SemanticPathNode, SemanticRole, SemanticSvgAst } from "../ast/index.js";
import type { ForegroundInOutlineStrategy, ResolvedCompilerConfig } from "../config/index.js";

export type RenderingMode = "outline" | "fill" | "duotone";

export type RenderingLayerKind = "primary" | "accent" | "foreground" | "background";

export interface RenderingPathNode {
  readonly sourcePathIndex: number;
  readonly id?: string;
  readonly d: string;
  readonly path: SemanticPathNode["path"];
  readonly paint: SemanticPathNode["paint"];
  readonly semanticRole: SemanticRole;
  readonly paintOrder: number;
}

export interface RenderingLayer {
  readonly kind: RenderingLayerKind;
  readonly zIndex: number;
  readonly paths: readonly RenderingPathNode[];
}

export interface RenderingAstBase {
  readonly kind: RenderingMode;
  readonly name: string;
  readonly viewBox: SymbolBounds;
  readonly layers: readonly RenderingLayer[];
}

export interface OutlineRenderingAst extends RenderingAstBase {
  readonly kind: "outline";
  readonly cutoutHandling: ForegroundInOutlineStrategy;
}

export interface DuotoneRenderingAst extends RenderingAstBase {
  readonly kind: "duotone";
}

export type FillBooleanGroup = "foreground" | "background";

export type FillGeometryRequest =
  | {
      readonly type: "union";
      readonly target: FillBooleanGroup;
      readonly inputPathIndexes: readonly number[];
    }
  | {
      readonly type: "subtract";
      readonly target: "foreground";
      readonly subject: "foreground";
      readonly operand: "background";
    };

export interface FillRenderingAst extends RenderingAstBase {
  readonly kind: "fill";
  readonly geometryRequests: readonly FillGeometryRequest[];
}

export type RenderingAst = OutlineRenderingAst | FillRenderingAst | DuotoneRenderingAst;

export function compileRendering(
  semantic: SemanticSvgAst,
  mode: RenderingMode,
  config: ResolvedCompilerConfig
): RenderingAst {
  switch (mode) {
    case "outline":
      return compileOutline(semantic, config);
    case "fill":
      return compileFill(semantic, config);
    case "duotone":
      return compileDuotone(semantic, config);
    default:
      return assertNever(mode);
  }
}

export function compileOutline(
  semantic: SemanticSvgAst,
  config: ResolvedCompilerConfig
): OutlineRenderingAst {
  const primaryPaths = selectRenderingPaths(semantic, (path) => path.role === "primary");
  const cutoutPaths =
    config.outline.foreground === "convert-to-background"
      ? selectRenderingPaths(semantic, (path) => path.role === "cutout")
      : [];

  return {
    kind: "outline",
    name: semantic.name,
    viewBox: semantic.viewBox,
    cutoutHandling: config.outline.foreground,
    layers: [
      createLayer("background", 0, cutoutPaths),
      createLayer("primary", 1, primaryPaths)
    ].filter(hasPaths)
  };
}

export function compileDuotone(
  semantic: SemanticSvgAst,
  config: ResolvedCompilerConfig
): DuotoneRenderingAst {
  void config;

  const accentPaths = selectRenderingPaths(
    semantic,
    (path) => path.role === "accent" || path.role === "secondary"
  );
  const primaryPaths = selectRenderingPaths(semantic, (path) => path.role === "primary");

  return {
    kind: "duotone",
    name: semantic.name,
    viewBox: semantic.viewBox,
    layers: [createLayer("accent", 0, accentPaths), createLayer("primary", 1, primaryPaths)].filter(
      hasPaths
    )
  };
}

export function compileFill(
  semantic: SemanticSvgAst,
  config: ResolvedCompilerConfig
): FillRenderingAst {
  void config;

  const foregroundPaths = selectRenderingPaths(semantic, isFillForegroundPath);
  const backgroundPaths = selectRenderingPaths(semantic, (path) => path.role === "cutout");

  return {
    kind: "fill",
    name: semantic.name,
    viewBox: semantic.viewBox,
    layers: [
      createLayer("foreground", 0, foregroundPaths),
      createLayer("background", 1, backgroundPaths)
    ].filter(hasPaths),
    geometryRequests: createFillGeometryRequests(foregroundPaths, backgroundPaths)
  };
}

function selectRenderingPaths(
  semantic: SemanticSvgAst,
  predicate: (path: SemanticPathNode) => boolean
): readonly RenderingPathNode[] {
  return semantic.paths.flatMap((path, index) =>
    predicate(path) ? [createRenderingPath(path, index)] : []
  );
}

function createRenderingPath(path: SemanticPathNode, sourcePathIndex: number): RenderingPathNode {
  return {
    ...(path.id === undefined ? {} : { id: path.id }),
    sourcePathIndex,
    d: path.d,
    path: path.path,
    paint: path.paint,
    semanticRole: path.role,
    paintOrder: path.paintOrder
  };
}

function createLayer(
  kind: RenderingLayerKind,
  zIndex: number,
  paths: readonly RenderingPathNode[]
): RenderingLayer {
  return {
    kind,
    zIndex,
    paths
  };
}

function hasPaths(layer: RenderingLayer): boolean {
  return layer.paths.length > 0;
}

function isFillForegroundPath(path: SemanticPathNode): boolean {
  return path.role === "primary" || path.role === "accent" || path.role === "secondary";
}

function createFillGeometryRequests(
  foregroundPaths: readonly RenderingPathNode[],
  backgroundPaths: readonly RenderingPathNode[]
): readonly FillGeometryRequest[] {
  const requests: FillGeometryRequest[] = [];

  if (foregroundPaths.length > 0) {
    requests.push({
      type: "union",
      target: "foreground",
      inputPathIndexes: foregroundPaths.map((path) => path.sourcePathIndex)
    });
  }

  if (backgroundPaths.length > 0) {
    requests.push({
      type: "union",
      target: "background",
      inputPathIndexes: backgroundPaths.map((path) => path.sourcePathIndex)
    });
  }

  if (foregroundPaths.length > 0 && backgroundPaths.length > 0) {
    requests.push({
      type: "subtract",
      target: "foreground",
      subject: "foreground",
      operand: "background"
    });
  }

  return requests;
}
