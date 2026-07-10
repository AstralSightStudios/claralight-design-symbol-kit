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

export interface SymbolMoveToCommand {
  readonly type: "moveTo";
  readonly point: SymbolPoint;
}

export interface SymbolLineToCommand {
  readonly type: "lineTo";
  readonly point: SymbolPoint;
}

export interface SymbolCurveToCommand {
  readonly type: "curveTo";
  readonly controlPoint1: SymbolPoint;
  readonly controlPoint2: SymbolPoint;
  readonly point: SymbolPoint;
}

export interface SymbolCloseCommand {
  readonly type: "close";
}

export type SymbolPathCommand =
  | SymbolMoveToCommand
  | SymbolLineToCommand
  | SymbolCurveToCommand
  | SymbolCloseCommand;

export interface SymbolPath {
  readonly id?: string;
  readonly commands: readonly SymbolPathCommand[];
}

export interface SymbolVariant {
  readonly weight: SymbolWeight;
  readonly paths: readonly SymbolPath[];
}

export interface SymbolIrMetadata {
  readonly sourceName?: string;
  readonly generatedAt?: string;
}

export interface SymbolIr {
  readonly schemaVersion: typeof SYMBOL_IR_SCHEMA_VERSION;
  readonly name: string;
  readonly viewBox: SymbolViewBox;
  readonly variants: readonly SymbolVariant[];
  readonly metadata?: SymbolIrMetadata;
}
