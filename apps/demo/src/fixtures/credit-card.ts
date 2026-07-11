import {
  compileSymbol,
  type CompilerConfigInput,
  type GeometryMaterializationInput,
  type GeometryMaterializer,
  type GeometryRegion,
  type RenderingLayerKind
} from "@claralight-design/symbol-kit-compiler";
import { SymbolWeight, type SymbolIr } from "@claralight-design/symbol-kit-core";

import creditCardSvg from "../../../../test/CreditCard.svg?raw";

const config: CompilerConfigInput = {
  colors: {
    foreground: ["#000000"]
  },
  styles: {
    normal: {
      color: "#000000",
      reverse: "#000000",
      lineOpacity: 1,
      duotoneLineOpacity: 0,
      backgroundOpacity: 0,
      noFillBackgroundOpacity: 0,
      noDuotoneBackgroundOpacity: 0
    },
    duotone: {
      color: "#000000",
      reverse: "#000000",
      lineOpacity: 0,
      duotoneLineOpacity: 0.7,
      backgroundOpacity: 0.2,
      noFillBackgroundOpacity: 0.3,
      noDuotoneBackgroundOpacity: 0
    },
    fill: {
      color: "#000000",
      reverse: "#FFFFFF",
      lineOpacity: 0,
      duotoneLineOpacity: 0.6,
      backgroundOpacity: 0.8,
      noFillBackgroundOpacity: 0,
      noDuotoneBackgroundOpacity: 0.9
    }
  },
  weights: {
    [SymbolWeight.Ultralight]: { strokeWidth: 0.6 }
  },
  modes: ["outline", "fill", "duotone"]
};

const geometryMaterializer: GeometryMaterializer = {
  materialize(input) {
    const primaryLayer = input.rendering.kind === "fill" ? "foreground" : "primary";
    const primary = selectLayerGeometry(input, primaryLayer);
    const accent = selectLayerGeometry(input, "accent");

    return accent.paths.length === 0 ? { primary } : { primary, accent };
  }
};

const compilation = compileSymbol({
  name: "CreditCard",
  sources: [{ fileName: "CreditCard.svg", svg: creditCardSvg }],
  config,
  geometryMaterializer
});

export const creditCardDiagnostics = compilation.diagnostics;
export const creditCardSymbol = requireSymbol(compilation.symbol);

function selectLayerGeometry(
  input: GeometryMaterializationInput,
  layerKind: RenderingLayerKind
): GeometryRegion {
  const indexes = new Set(
    input.rendering.layers
      .filter((layer) => layer.kind === layerKind)
      .flatMap((layer) => layer.paths.map((path) => path.sourcePathIndex))
  );

  return {
    paths: input.lowered.paths
      .filter((path) => indexes.has(path.sourcePathIndex))
      .map((path) => path.geometry)
  };
}

function requireSymbol(symbol: SymbolIr | undefined): SymbolIr {
  if (symbol === undefined) {
    throw new Error("CreditCard fixture did not compile to Symbol IR.");
  }

  return symbol;
}
