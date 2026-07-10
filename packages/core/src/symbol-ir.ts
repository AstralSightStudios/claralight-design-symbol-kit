import type { SymbolWeight } from "./weight.js";

export const SYMBOL_IR_SCHEMA_VERSION = 1;

export interface SymbolPoint {
  readonly x: number;
  readonly y: number;
}

export interface SymbolBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export type SymbolViewBox = SymbolBounds;

export interface SymbolMoveCommand {
  readonly type: "move";
  readonly point: SymbolPoint;
}

export interface SymbolLineCommand {
  readonly type: "line";
  readonly point: SymbolPoint;
}

export interface SymbolCubicCommand {
  readonly type: "cubic";
  readonly controlPoint1: SymbolPoint;
  readonly controlPoint2: SymbolPoint;
  readonly point: SymbolPoint;
}

export interface SymbolCloseCommand {
  readonly type: "close";
}

export type SymbolPathCommand =
  SymbolMoveCommand | SymbolLineCommand | SymbolCubicCommand | SymbolCloseCommand;

export interface SymbolPath {
  readonly commands: readonly SymbolPathCommand[];
}

export interface SymbolGeometry {
  readonly paths: readonly SymbolPath[];
}

export type SymbolLayerRole = "primary" | "accent";

export interface SymbolPrimaryLayer {
  readonly role: "primary";
  readonly geometry: SymbolGeometry;
}

export interface SymbolAccentLayer {
  readonly role: "accent";
  readonly geometry: SymbolGeometry;
}

export type SymbolLayer = SymbolPrimaryLayer | SymbolAccentLayer;

export type SymbolVariantKind = "outline" | "fill" | "duotone";

export interface SymbolOutlineVariant {
  readonly kind: "outline";
  readonly weight: SymbolWeight;
  readonly layers: readonly [primary: SymbolPrimaryLayer];
}

export interface SymbolFillVariant {
  readonly kind: "fill";
  readonly weight: SymbolWeight;
  readonly layers: readonly [primary: SymbolPrimaryLayer];
}

export interface SymbolDuotoneVariant {
  readonly kind: "duotone";
  readonly weight: SymbolWeight;
  readonly layers:
    | readonly [primary: SymbolPrimaryLayer]
    | readonly [accent: SymbolAccentLayer, primary: SymbolPrimaryLayer];
}

export type SymbolVariant = SymbolOutlineVariant | SymbolFillVariant | SymbolDuotoneVariant;

export interface SymbolIr {
  readonly schemaVersion: typeof SYMBOL_IR_SCHEMA_VERSION;
  readonly name: string;
  readonly viewBox: SymbolViewBox;
  readonly variants: readonly SymbolVariant[];
}
