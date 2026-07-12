import type { SymbolWeight } from "@claralight-design/symbol-kit-core";

import type { MaterializedVariantGeometry } from "../ir/index.js";
import type { RenderingAst } from "../rendering/index.js";
import type { GeometryLoweringResult } from "./lowering/index.js";

export interface GeometryMaterializationInput {
  readonly sourceWeight: SymbolWeight;
  readonly weight: SymbolWeight;
  readonly rendering: RenderingAst;
  readonly lowered: GeometryLoweringResult;
}

export interface GeometryMaterializer {
  materialize(input: GeometryMaterializationInput): MaterializedVariantGeometry;
}
