import {
  assertNever,
  type SymbolIr,
  type SymbolLayer,
  type SymbolPath,
  type SymbolPathCommand,
  type SymbolVariant,
  type SymbolVariantKind,
  type SymbolWeight
} from "@claralight-design/symbol-kit-core";

export interface SvgRenderOptions {
  readonly kind: SymbolVariantKind;
  readonly weight: SymbolWeight;
  readonly primaryColor?: string;
  readonly accentColor?: string;
}

export function renderSvg(symbol: SymbolIr, options: SvgRenderOptions): string {
  const variant = findVariant(symbol, options);
  const viewBox = formatViewBox(symbol);
  const primaryColor = options.primaryColor ?? "currentColor";
  const layers = variant.layers
    .map((layer) => renderLayer(layer, options.accentColor))
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="${escapeAttribute(primaryColor)}">${layers}</svg>`;
}

function findVariant(symbol: SymbolIr, options: SvgRenderOptions): SymbolVariant {
  const variant = symbol.variants.find(
    (candidate) => candidate.kind === options.kind && candidate.weight === options.weight
  );

  if (variant === undefined) {
    throw new Error(`Symbol variant not found: ${options.kind}:${options.weight}`);
  }

  return variant;
}

function formatViewBox(symbol: SymbolIr): string {
  const { x, y, width, height } = symbol.viewBox;
  return [x, y, width, height].map(formatNumber).join(" ");
}

function renderLayer(layer: SymbolLayer, accentColor: string | undefined): string {
  const paths = layer.geometry.paths.map(renderPath).join("");
  const fill =
    layer.role === "accent" && accentColor !== undefined
      ? ` fill="${escapeAttribute(accentColor)}"`
      : "";
  return `<g data-symbol-layer="${layer.role}"${fill}>${paths}</g>`;
}

function renderPath(path: SymbolPath): string {
  const pathData = path.commands.map(renderPathCommand).join("");
  return `<path d="${pathData}"/>`;
}

function renderPathCommand(command: SymbolPathCommand): string {
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
  return Object.is(value, -0) ? "0" : String(value);
}

function escapeAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
