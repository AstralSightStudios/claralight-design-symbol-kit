export { NoopGeometryProcessor } from "./noop.js";

export { lowerPathAst, lowerRenderingGeometry } from "./lowering/index.js";

export type { GeometryLoweringResult, LoweredGeometryPath } from "./lowering/index.js";

export type { GeometryMaterializationInput, GeometryMaterializer } from "./materializer.js";

export { createPaperGeometryMaterializer } from "./paper-materializer.js";

export type { PaperGeometryMaterializerOptions } from "./paper-materializer.js";

export type { GeometryProcessor } from "./processor.js";

export type {
  GeometryCloseCommand,
  GeometryCubicCommand,
  GeometryLineCommand,
  GeometryMoveCommand,
  GeometryPath,
  GeometryPathCommand,
  GeometryPoint,
  GeometryRegion
} from "./types.js";
