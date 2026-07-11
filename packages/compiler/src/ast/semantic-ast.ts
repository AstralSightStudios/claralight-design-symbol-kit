import type { SymbolBounds } from "@claralight-design/symbol-kit-core";

import type { PathAst } from "./path-ast.js";
import type { SourcePaint } from "./source-ast.js";

export type SemanticRole =
  | "primary"
  | "line"
  | "duotone-line"
  | "accent"
  | "background-no-fill"
  | "background-no-duotone"
  | "secondary"
  | "cutout"
  | "hidden"
  | "unknown";

export type SemanticColorRole = "color" | "reverse";

export interface SemanticPathNode {
  readonly id?: string;
  readonly d: string;
  readonly path: PathAst;
  readonly paint: SourcePaint;
  readonly role: SemanticRole;
  readonly colorRole?: SemanticColorRole;
  readonly paintOrder: number;
}

export interface SemanticSvgAst {
  readonly name: string;
  readonly viewBox: SymbolBounds;
  readonly paths: readonly SemanticPathNode[];
}

export type ClassifiedPathRole = SemanticRole;
export type ClassifiedPathNode = SemanticPathNode;
export type SemanticSymbolAst = SemanticSvgAst;
