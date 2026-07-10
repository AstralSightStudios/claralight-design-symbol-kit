import type { SourceSvgAst } from "../ast/index.js";

export interface ParseSvgSourceInput {
  readonly name: string;
  readonly svg: string;
}

export function parseSvgSource(input: ParseSvgSourceInput): SourceSvgAst {
  if (input.svg.trim().length === 0) {
    throw new TypeError("SVG source must not be empty.");
  }

  throw new Error("SVG parser is not implemented yet.");
}
