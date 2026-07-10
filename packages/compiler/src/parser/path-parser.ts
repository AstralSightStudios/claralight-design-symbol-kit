import type { PathAst } from "../ast/index.js";

export function parsePathData(pathData: string): PathAst {
  if (pathData.trim().length === 0) {
    throw new TypeError("SVG path data must not be empty.");
  }

  throw new Error("SVG path parser is not implemented yet.");
}
