import type { PathAst } from "./path-ast.js";
import type { SourcePaint } from "./source-ast.js";

export type ClassifiedPathRole = "foreground" | "background" | "primary" | "secondary" | "cutout";

export interface ClassifiedPathNode {
  readonly id?: string;
  readonly path: PathAst;
  readonly paint: SourcePaint;
  readonly role: ClassifiedPathRole;
  readonly paintOrder: number;
}

export interface SemanticSymbolAst {
  readonly paths: readonly ClassifiedPathNode[];
}
