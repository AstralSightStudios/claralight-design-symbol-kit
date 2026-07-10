import type { GeometryPath, GeometryRegion } from "./types.js";

export interface GeometryProcessor {
  expandStroke(path: GeometryPath, strokeWidth: number): GeometryRegion;
  union(regions: readonly GeometryRegion[]): GeometryRegion;
  subtract(base: GeometryRegion, subtraction: GeometryRegion): GeometryRegion;
}
