import type { SymbolBounds } from "@claralight-design/symbol-kit-core";

export type SourcePaintValue = string;

export interface SourcePaint {
  readonly fill?: SourcePaintValue;
  readonly stroke?: SourcePaintValue;
  readonly strokeWidth?: number;
  readonly opacity: number;
  readonly fillOpacity?: number;
  readonly strokeOpacity?: number;
}

export interface SourcePathNode {
  readonly id?: string;
  readonly d: string;
  readonly paint: SourcePaint;
  readonly paintOrder: number;
}

export interface SourceSvgAst {
  readonly name: string;
  readonly viewBox: SymbolBounds;
  readonly paths: readonly SourcePathNode[];
}
