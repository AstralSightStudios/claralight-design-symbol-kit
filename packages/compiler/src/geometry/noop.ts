import type { GeometryProcessor } from "./processor.js";
import type { GeometryPath, GeometryRegion } from "./types.js";

const ERROR_MESSAGE = "Geometry backend is not implemented";

export class NoopGeometryProcessor implements GeometryProcessor {
  expandStroke(path: GeometryPath, strokeWidth: number): GeometryRegion {
    void path;
    void strokeWidth;
    throw new Error(ERROR_MESSAGE);
  }

  union(regions: readonly GeometryRegion[]): GeometryRegion {
    void regions;
    throw new Error(ERROR_MESSAGE);
  }

  subtract(base: GeometryRegion, subtraction: GeometryRegion): GeometryRegion {
    void base;
    void subtraction;
    throw new Error(ERROR_MESSAGE);
  }
}
