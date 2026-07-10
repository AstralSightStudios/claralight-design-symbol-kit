import type {
  SourcePaint,
  SourcePathNode,
  SourceStrokeLinecap,
  SourceStrokeLinejoin,
  SourceSvgAst
} from "../ast/index.js";
import { parsePathData } from "./path-parser.js";

const SVG_ROOT_PATTERN = /<svg\b([^>]*)>/iu;
const SVG_CLOSE_PATTERN = /<\/svg\s*>/iu;
const PATH_PATTERN = /<path\b([^>]*)\/?\s*>/giu;
const ATTRIBUTE_PATTERN = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/gu;
const NUMBER_PATTERN = /^[+-]?(?:\d+\.\d*|\.\d+|\d+)(?:[eE][+-]?\d+)?$/;

export interface ParseSvgSourceInput {
  readonly name: string;
  readonly svg: string;
}

export function parseSvgSource(input: ParseSvgSourceInput): SourceSvgAst {
  if (input.svg.trim().length === 0) {
    throw new TypeError("SVG source must not be empty.");
  }

  const source = input.svg.replace(/<!--[\s\S]*?-->/gu, "");
  const rootMatch = SVG_ROOT_PATTERN.exec(source);
  if (rootMatch === null) {
    throw new SyntaxError("SVG source must contain an svg root element.");
  }

  const rootTag = rootMatch[0];
  const rootAttributes = parseAttributes(rootMatch[1] ?? "");
  const rootEnd = rootMatch.index + rootTag.length;
  const isSelfClosing = /\/\s*>$/u.test(rootTag);
  const closeMatch = SVG_CLOSE_PATTERN.exec(source.slice(rootEnd));

  if (!isSelfClosing && closeMatch === null) {
    throw new SyntaxError("SVG root element must be closed.");
  }

  const contentEnd = isSelfClosing ? rootEnd : rootEnd + (closeMatch?.index ?? 0);
  const content = source.slice(rootEnd, contentEnd);
  const viewBox = parseViewBox(rootAttributes);
  const paths = parsePaths(content, rootAttributes);

  return {
    name: input.name,
    viewBox,
    paths
  };
}

function parsePaths(
  content: string,
  rootAttributes: ReadonlyMap<string, string>
): readonly SourcePathNode[] {
  return [...content.matchAll(PATH_PATTERN)].map((match, paintOrder) => {
    const attributes = parseAttributes(match[1] ?? "");
    const d = requireAttribute(attributes, "d", `SVG path at index ${String(paintOrder)}`).trim();

    if (d.length === 0) {
      throw new SyntaxError(`SVG path at index ${String(paintOrder)} must have non-empty d data.`);
    }

    const id = attributes.get("id");

    return {
      ...(id === undefined ? {} : { id }),
      d,
      path: parsePathData(d),
      paint: parsePaint(attributes, rootAttributes),
      paintOrder
    };
  });
}

function parsePaint(
  attributes: ReadonlyMap<string, string>,
  rootAttributes: ReadonlyMap<string, string>
): SourcePaint {
  const fill = attributes.get("fill") ?? rootAttributes.get("fill") ?? "black";
  const stroke = attributes.get("stroke") ?? rootAttributes.get("stroke");
  const strokeWidthValue = attributes.get("stroke-width") ?? rootAttributes.get("stroke-width");
  const strokeLinecapValue =
    attributes.get("stroke-linecap") ?? rootAttributes.get("stroke-linecap");
  const strokeLinejoinValue =
    attributes.get("stroke-linejoin") ?? rootAttributes.get("stroke-linejoin");
  const fillOpacityValue = attributes.get("fill-opacity") ?? rootAttributes.get("fill-opacity");
  const strokeOpacityValue =
    attributes.get("stroke-opacity") ?? rootAttributes.get("stroke-opacity");
  const rootOpacity = parseOpacity(rootAttributes.get("opacity"), "svg opacity") ?? 1;
  const pathOpacity = parseOpacity(attributes.get("opacity"), "path opacity") ?? 1;
  const strokeWidth = parseOptionalNumber(strokeWidthValue, "stroke-width");
  const strokeLinecap = parseStrokeLinecap(strokeLinecapValue);
  const strokeLinejoin = parseStrokeLinejoin(strokeLinejoinValue);
  const fillOpacity = parseOpacity(fillOpacityValue, "fill-opacity");
  const strokeOpacity = parseOpacity(strokeOpacityValue, "stroke-opacity");

  return {
    fill,
    ...(stroke === undefined ? {} : { stroke }),
    ...(strokeWidth === undefined ? {} : { strokeWidth }),
    ...(strokeLinecap === undefined ? {} : { strokeLinecap }),
    ...(strokeLinejoin === undefined ? {} : { strokeLinejoin }),
    opacity: rootOpacity * pathOpacity,
    ...(fillOpacity === undefined ? {} : { fillOpacity }),
    ...(strokeOpacity === undefined ? {} : { strokeOpacity })
  };
}

function parseStrokeLinecap(value: string | undefined): SourceStrokeLinecap | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "butt" || normalized === "round" || normalized === "square") {
    return normalized;
  }

  throw new SyntaxError(`Unsupported stroke-linecap value: ${value}.`);
}

function parseStrokeLinejoin(value: string | undefined): SourceStrokeLinejoin | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "miter" || normalized === "round" || normalized === "bevel") {
    return normalized;
  }

  throw new SyntaxError(`Unsupported stroke-linejoin value: ${value}.`);
}

function parseViewBox(attributes: ReadonlyMap<string, string>): SourceSvgAst["viewBox"] {
  const value = requireAttribute(attributes, "viewbox", "SVG root");
  const components = value
    .trim()
    .split(/[\s,]+/u)
    .filter((component) => component.length > 0)
    .map((component) => parseNumber(component, "viewBox"));

  if (components.length !== 4) {
    throw new SyntaxError("SVG viewBox must contain exactly four numbers.");
  }

  const [x, y, width, height] = components;
  if (x === undefined || y === undefined || width === undefined || height === undefined) {
    throw new SyntaxError("SVG viewBox must contain exactly four numbers.");
  }
  if (width <= 0 || height <= 0) {
    throw new SyntaxError("SVG viewBox width and height must be greater than zero.");
  }

  return { x, y, width, height };
}

function parseAttributes(source: string): ReadonlyMap<string, string> {
  const attributes = new Map<string, string>();

  for (const match of source.matchAll(ATTRIBUTE_PATTERN)) {
    const name = match[1]?.toLowerCase();
    const rawValue = match[2] ?? match[3];
    if (name !== undefined && rawValue !== undefined) {
      attributes.set(name, decodeXmlEntities(rawValue));
    }
  }

  return attributes;
}

function requireAttribute(
  attributes: ReadonlyMap<string, string>,
  name: string,
  owner: string
): string {
  const value = attributes.get(name);
  if (value === undefined) {
    throw new SyntaxError(`${owner} requires a ${name} attribute.`);
  }

  return value;
}

function parseOptionalNumber(value: string | undefined, attribute: string): number | undefined {
  return value === undefined ? undefined : parseNumber(value, attribute);
}

function parseOpacity(value: string | undefined, attribute: string): number | undefined {
  const opacity = parseOptionalNumber(value, attribute);
  if (opacity !== undefined && (opacity < 0 || opacity > 1)) {
    throw new SyntaxError(`${attribute} must be between 0 and 1.`);
  }

  return opacity;
}

function parseNumber(value: string, attribute: string): number {
  const normalized = value.trim();
  if (!NUMBER_PATTERN.test(normalized)) {
    throw new SyntaxError(`${attribute} must be a finite number.`);
  }

  const number = Number(normalized);
  if (!Number.isFinite(number)) {
    throw new SyntaxError(`${attribute} must be a finite number.`);
  }

  return number;
}

function decodeXmlEntities(value: string): string {
  return value.replace(/&([^;]+);/gu, (_match, entity: string) => {
    switch (entity) {
      case "amp":
        return "&";
      case "quot":
        return '"';
      case "apos":
        return "'";
      case "lt":
        return "<";
      case "gt":
        return ">";
      default:
        return decodeNumericEntity(entity);
    }
  });
}

function decodeNumericEntity(entity: string): string {
  const hexadecimal = /^#x([\dA-Fa-f]+)$/u.exec(entity);
  const decimal = /^#(\d+)$/u.exec(entity);
  const hexadecimalValue = hexadecimal?.[1];
  const codePoint =
    hexadecimalValue === undefined ? Number(decimal?.[1]) : Number.parseInt(hexadecimalValue, 16);

  if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) {
    throw new SyntaxError(`Unsupported XML entity: &${entity};`);
  }

  return String.fromCodePoint(codePoint);
}
