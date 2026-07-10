import type { SymbolBounds } from "@claralight-design/symbol-kit-core";

import type { SourcePaint } from "./source-ast.js";

export type SemanticRole = "primary" | "secondary" | "cutout" | "unknown";

export interface SemanticPathNode {
  readonly id?: string;
  readonly d: string;
  readonly paint: SourcePaint;
  readonly role: SemanticRole;
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
