import {
  SYMBOL_IR_SCHEMA_VERSION,
  assertNever,
  type SymbolAccentLayer,
  type SymbolBounds,
  type SymbolDuotoneVariant,
  type SymbolFillVariant,
  type SymbolGeometry,
  type SymbolIr,
  type SymbolOutlineVariant,
  type SymbolPathCommand,
  type SymbolPrimaryLayer,
  type SymbolVariant,
  type SymbolWeight
} from "@claralight-design/symbol-kit-core";

import type { GeometryPathCommand, GeometryRegion } from "../geometry/index.js";
import type { RenderingAst } from "../rendering/index.js";

export interface MaterializedVariantGeometry {
  readonly primary: GeometryRegion;
  readonly accent?: GeometryRegion;
}

export interface SymbolIrVariantInput {
  readonly weight: SymbolWeight;
  readonly rendering: RenderingAst;
  readonly geometry: MaterializedVariantGeometry;
}

export interface CreateSymbolIrInput {
  readonly name: string;
  readonly variants: readonly SymbolIrVariantInput[];
}

export function createSymbolIr(input: CreateSymbolIrInput): SymbolIr {
  const firstVariant = input.variants[0];

  if (firstVariant === undefined) {
    throw new TypeError("Symbol IR requires at least one variant.");
  }

  const viewBox = firstVariant.rendering.viewBox;
  const variantKeys = new Set<string>();

  for (const variant of input.variants) {
    assertRenderingIdentity(input.name, viewBox, variant.rendering);

    const key = `${variant.rendering.kind}:${variant.weight}`;
    if (variantKeys.has(key)) {
      throw new TypeError(`Duplicate Symbol IR variant: ${key}`);
    }
    variantKeys.add(key);
  }

  return {
    schemaVersion: SYMBOL_IR_SCHEMA_VERSION,
    name: input.name,
    viewBox: { ...viewBox },
    variants: input.variants.map(createSymbolVariant)
  };
}

export function createSymbolVariant(input: SymbolIrVariantInput): SymbolVariant {
  const primary = createPrimaryLayer(input.geometry.primary);

  switch (input.rendering.kind) {
    case "outline":
      assertAccentGeometry(input, false);
      return {
        kind: "outline",
        weight: input.weight,
        layers: [primary]
      } satisfies SymbolOutlineVariant;
    case "fill":
      assertAccentGeometry(input, false);
      return {
        kind: "fill",
        weight: input.weight,
        layers: [primary]
      } satisfies SymbolFillVariant;
    case "duotone": {
      const accent = createAccentLayer(input);
      return {
        kind: "duotone",
        weight: input.weight,
        layers: accent === undefined ? [primary] : [accent, primary]
      } satisfies SymbolDuotoneVariant;
    }
    default:
      return assertNever(input.rendering);
  }
}

function createPrimaryLayer(region: GeometryRegion): SymbolPrimaryLayer {
  return {
    role: "primary",
    geometry: createSymbolGeometry(region)
  };
}

function createAccentLayer(input: SymbolIrVariantInput): SymbolAccentLayer | undefined {
  const renderingHasAccent = input.rendering.layers.some((layer) => layer.kind === "accent");
  const accent = input.geometry.accent;

  if (renderingHasAccent !== (accent !== undefined)) {
    throw new TypeError("Duotone accent geometry must match the Rendering AST accent layer.");
  }

  return accent === undefined
    ? undefined
    : {
        role: "accent",
        geometry: createSymbolGeometry(accent)
      };
}

function createSymbolGeometry(region: GeometryRegion): SymbolGeometry {
  return {
    paths: region.paths.map((path) => ({
      commands: path.commands.map(createSymbolPathCommand)
    }))
  };
}

function createSymbolPathCommand(command: GeometryPathCommand): SymbolPathCommand {
  switch (command.type) {
    case "move":
    case "line":
      return {
        type: command.type,
        point: { ...command.point }
      };
    case "cubic":
      return {
        type: "cubic",
        controlPoint1: { ...command.controlPoint1 },
        controlPoint2: { ...command.controlPoint2 },
        point: { ...command.point }
      };
    case "close":
      return { type: "close" };
    default:
      return assertNever(command);
  }
}

function assertAccentGeometry(input: SymbolIrVariantInput, expected: boolean): void {
  if ((input.geometry.accent !== undefined) !== expected) {
    throw new TypeError(`${input.rendering.kind} variants cannot contain accent geometry.`);
  }
}

function assertRenderingIdentity(
  name: string,
  viewBox: SymbolBounds,
  rendering: RenderingAst
): void {
  if (rendering.name !== name) {
    throw new TypeError(
      `Rendering AST name "${rendering.name}" does not match Symbol IR name "${name}".`
    );
  }

  if (!isSameViewBox(rendering.viewBox, viewBox)) {
    throw new TypeError("All Symbol IR variants must use the same viewBox.");
  }
}

function isSameViewBox(left: SymbolBounds, right: SymbolBounds): boolean {
  return (
    left.x === right.x &&
    left.y === right.y &&
    left.width === right.width &&
    left.height === right.height
  );
}
