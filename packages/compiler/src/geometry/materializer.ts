import type { SymbolWeight } from "@claralight-design/symbol-kit-core";

import type { MaterializedVariantGeometry } from "../ir/index.js";
import type { RenderingAst } from "../rendering/index.js";

export interface GeometryMaterializationInput {
  readonly weight: SymbolWeight;
  readonly rendering: RenderingAst;
}

export interface GeometryMaterializer {
  materialize(input: GeometryMaterializationInput): MaterializedVariantGeometry;
}
