import type { RenderingAst } from "../../rendering/index.js";
import type { GeometryPath } from "../types.js";
import { lowerPathAst } from "./path.js";

export interface LoweredGeometryPath {
  readonly sourcePathIndex: number;
  readonly geometry: GeometryPath;
}

export interface GeometryLoweringResult {
  readonly paths: readonly LoweredGeometryPath[];
}

export function lowerRenderingGeometry(rendering: RenderingAst): GeometryLoweringResult {
  return {
    paths: rendering.layers.flatMap((layer) =>
      layer.paths.map((path) => ({
        sourcePathIndex: path.sourcePathIndex,
        geometry: lowerPathAst(path.path)
      }))
    )
  };
}
