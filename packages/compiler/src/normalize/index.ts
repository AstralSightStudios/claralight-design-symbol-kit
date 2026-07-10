import type { SourceSvgAst } from "../ast/index.js";

export function normalizeSourceSvgAst(source: SourceSvgAst): SourceSvgAst {
  const paths = source.paths
    .map((path) => ({
      ...path,
      paint: { ...path.paint }
    }))
    .sort((left, right) => left.paintOrder - right.paintOrder);

  return {
    name: source.name,
    viewBox: { ...source.viewBox },
    paths
  };
}
