import {
  compileSymbol,
  createPaperGeometryMaterializer,
  type CompileDiagnostic,
  type CompilerConfigInput
} from "@claralight-design/symbol-kit-compiler";
import { SymbolWeight, type SymbolIr } from "@claralight-design/symbol-kit-core";

const svgFixtures = import.meta.glob<string>("../../../../test/*.svg", {
  eager: true,
  import: "default",
  query: "?raw"
});

const config: CompilerConfigInput = {
  colors: {
    foreground: ["#000000"]
  },
  styles: {
    build: {
      color: "#000000",
      reverse: "#FFFFFF",
      lineOpacity: 0.1,
      duotoneLineOpacity: 0.6,
      backgroundOpacity: 0.8,
      noFillBackgroundOpacity: 0.1,
      noDuotoneBackgroundOpacity: 0.9
    },
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
  rendering: {
    duotoneFillOpacity: 0.2,
    fillFillOpacity: 1
  },
  modes: ["outline", "fill", "duotone"]
};

export const demoAccentOpacity = config.rendering?.duotoneFillOpacity ?? 0.2;

const geometryMaterializer = createPaperGeometryMaterializer({
  sourceStrokeWidth: 0.6,
  weights: config.weights ?? {}
});

const compilations = Object.entries(svgFixtures)
  .map(([filePath, svg]) => {
    const fileName = filePath.split("/").at(-1);
    if (fileName === undefined) {
      throw new Error(`Invalid SVG fixture path: ${filePath}`);
    }

    const name = fileName.slice(0, -4);
    return compileSymbol({
      name,
      sources: [{ fileName, svg }],
      config,
      geometryMaterializer
    });
  })
  .sort((left, right) => requireSymbol(left.symbol).name.localeCompare(requireSymbol(right.symbol).name));

export const demoSymbols: readonly SymbolIr[] = compilations.map((result) =>
  requireSymbol(result.symbol)
);
export const demoDiagnostics: readonly CompileDiagnostic[] = compilations.flatMap(
  (result) => result.diagnostics
);

function requireSymbol(symbol: SymbolIr | undefined): SymbolIr {
  if (symbol === undefined) {
    throw new Error("SVG fixture did not compile to Symbol IR.");
  }

  return symbol;
}
