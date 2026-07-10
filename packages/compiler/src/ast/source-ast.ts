import type { SymbolBounds } from "@claralight-design/symbol-kit-core";

import type { PathAst } from "./path-ast.js";

export type SourcePaintValue = string;

export type SourceStrokeLinecap = "butt" | "round" | "square";

export type SourceStrokeLinejoin = "miter" | "round" | "bevel";

export interface SourcePaint {
  readonly fill?: SourcePaintValue;
  readonly stroke?: SourcePaintValue;
  readonly strokeWidth?: number;
  readonly strokeLinecap?: SourceStrokeLinecap;
  readonly strokeLinejoin?: SourceStrokeLinejoin;
  readonly opacity: number;
  readonly fillOpacity?: number;
  readonly strokeOpacity?: number;
}

export interface SourcePathNode {
  readonly id?: string;
  readonly d: string;
  readonly path: PathAst;
  readonly paint: SourcePaint;
  readonly paintOrder: number;
}

export interface SourceSvgAst {
  readonly name: string;
  readonly viewBox: SymbolBounds;
  readonly paths: readonly SourcePathNode[];
}
