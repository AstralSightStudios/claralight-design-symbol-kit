import { assertNever } from "./utils/assert-never.js";
import type { CompiledSymbolVariant, RenderableSymbol } from "./compiled-symbol.js";
import type {
  SymbolLayerRole,
  SymbolPathCommand,
  SymbolVariant,
  SymbolVariantKind,
  SymbolViewBox
} from "./symbol-ir.js";
import type { SymbolWeight } from "./weight.js";

export interface SymbolRenderOptions {
  readonly kind: SymbolVariantKind;
  readonly weight: SymbolWeight;
  readonly primaryColor?: string;
  readonly accentColor?: string;
  readonly accentOpacity?: number;
}

export interface SymbolRenderPath {
  readonly d: string;
  readonly fillRule: "evenodd";
}

export interface SymbolRenderLayer {
  readonly role: SymbolLayerRole;
  readonly fill?: string;
  readonly opacity?: number;
  readonly paths: readonly SymbolRenderPath[];
}

export interface SymbolRenderModel {
  readonly name: string;
  readonly viewBox: SymbolViewBox;
  readonly fill: string;
  readonly layers: readonly SymbolRenderLayer[];
}

export type SvgRenderOptions = SymbolRenderOptions;

export function createSymbolRenderModel(
  symbol: RenderableSymbol,
  options: SymbolRenderOptions
): SymbolRenderModel {
  const variant = findSymbolVariant(symbol, options.kind, options.weight);
  const accentOpacity = normalizeAccentOpacity(options.accentOpacity);

  return {
    name: symbol.name,
    viewBox: { ...symbol.viewBox },
    fill: options.primaryColor ?? "currentColor",
    layers: variant.layers.map((layer) => ({
      role: layer.role,
      ...(layer.role === "accent" && options.accentColor !== undefined
        ? { fill: options.accentColor }
        : {}),
      ...(layer.role === "accent" && accentOpacity !== undefined ? { opacity: accentOpacity } : {}),
      paths: resolveLayerPaths(layer).map((d) => ({
        d,
        fillRule: "evenodd"
      }))
    }))
  };
}

export function findSymbolVariant(
  symbol: RenderableSymbol,
  kind: SymbolVariantKind,
  weight: SymbolWeight
): SymbolVariant | CompiledSymbolVariant {
  const variant = symbol.variants.find(
    (candidate) => candidate.kind === kind && candidate.weight === weight
  );

  if (variant === undefined) {
    throw new Error(`Symbol variant not found: ${kind}:${weight}`);
  }

  return variant;
}

export function serializeSymbolPath(commands: readonly SymbolPathCommand[]): string {
  return commands.map(serializeSymbolPathCommand).join("");
}

export function renderSvg(symbol: RenderableSymbol, options: SvgRenderOptions): string {
  const model = createSymbolRenderModel(symbol, options);
  const viewBox = [model.viewBox.x, model.viewBox.y, model.viewBox.width, model.viewBox.height]
    .map(formatNumber)
    .join(" ");
  const layers = model.layers.map(renderLayer).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="${escapeAttribute(model.fill)}">${layers}</svg>`;
}

function resolveLayerPaths(
  layer: SymbolVariant["layers"][number] | CompiledSymbolVariant["layers"][number]
): readonly string[] {
  return "geometry" in layer
    ? layer.geometry.paths.map((path) => serializeSymbolPath(path.commands))
    : layer.paths;
}

function renderLayer(layer: SymbolRenderLayer): string {
  const fill = layer.fill === undefined ? "" : ` fill="${escapeAttribute(layer.fill)}"`;
  const opacity = layer.opacity === undefined ? "" : ` opacity="${formatNumber(layer.opacity)}"`;
  const paths = layer.paths
    .map((path) => `<path d="${escapeAttribute(path.d)}" fill-rule="${path.fillRule}"/>`)
    .join("");

  return `<g data-symbol-layer="${layer.role}"${fill}${opacity}>${paths}</g>`;
}

function serializeSymbolPathCommand(command: SymbolPathCommand): string {
  switch (command.type) {
    case "move":
      return `M${formatPoint(command.point)}`;
    case "line":
      return `L${formatPoint(command.point)}`;
    case "cubic":
      return `C${formatPoint(command.controlPoint1)} ${formatPoint(command.controlPoint2)} ${formatPoint(command.point)}`;
    case "close":
      return "Z";
    default:
      return assertNever(command);
  }
}

function formatPoint(point: { readonly x: number; readonly y: number }): string {
  return `${formatNumber(point.x)} ${formatNumber(point.y)}`;
}

function formatNumber(value: number): string {
  const rounded = Math.round(value * 1_000_000) / 1_000_000;
  return Object.is(rounded, -0) ? "0" : String(rounded);
}

function normalizeAccentOpacity(value: number | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new TypeError(`SVG accent opacity must be between 0 and 1: ${String(value)}.`);
  }

  return value;
}

function escapeAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
