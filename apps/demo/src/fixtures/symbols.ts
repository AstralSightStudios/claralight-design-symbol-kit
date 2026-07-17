import {
  compileSymbol,
  createPaperGeometryMaterializer,
  type CompileDiagnostic,
  type CompilerConfigInput,
  type SymbolWeightProfilesConfigInput
} from "@claralight-design/symbol-kit-compiler";
import {
  SYMBOL_WEIGHT_ORDER,
  SymbolWeight,
  type SymbolIr
} from "@claralight-design/symbol-kit-core";

const svgFixtures = import.meta.glob<string>("../../../../test/*.svg", {
  eager: true,
  import: "default",
  query: "?raw"
});

export const demoFixtureCount = Object.keys(svgFixtures).length;

const weightProfiles: SymbolWeightProfilesConfigInput = {
  [SymbolWeight.Ultralight]: { strokeWidth: 0.6 },
  [SymbolWeight.Thin]: { strokeWidth: 1.2 },
  [SymbolWeight.Light]: { strokeWidth: 1.8 },
  [SymbolWeight.Regular]: { strokeWidth: 2.2 },
  [SymbolWeight.Medium]: { strokeWidth: 2.8 }
};

export const demoWeights = SYMBOL_WEIGHT_ORDER.filter(
  (weight) => weightProfiles[weight] !== undefined
);

const config: CompilerConfigInput = {
  colors: {
    foreground: ["#000000"],
    background: ["#FFFFFF"]
  },
  styles: {
    build: {
      color: "#000000",
      reverse: "#FFFFFF",
      lineOpacity: 0.1,
      duotoneLineOpacity: 0.6,
      noFillLineOpacity: 0.5,
      noDuotoneLineOpacity: 0.4,
      onlyFillLineOpacity: 0.2,
      onlyDuotoneLineOpacity: 0.7,
      backgroundOpacity: 0.8,
      noFillBackgroundOpacity: 0.1,
      noDuotoneBackgroundOpacity: 0.9
    },
    normal: {
      color: "#000000",
      reverse: "#000000",
      lineOpacity: 1,
      duotoneLineOpacity: 0,
      noFillLineOpacity: 1,
      noDuotoneLineOpacity: 1,
      onlyFillLineOpacity: 0,
      onlyDuotoneLineOpacity: 0,
      backgroundOpacity: 0,
      noFillBackgroundOpacity: 0,
      noDuotoneBackgroundOpacity: 0
    },
    duotone: {
      color: "#000000",
      reverse: "#000000",
      lineOpacity: 0,
      duotoneLineOpacity: 0.7,
      noFillLineOpacity: 1,
      noDuotoneLineOpacity: 0,
      onlyFillLineOpacity: 0,
      onlyDuotoneLineOpacity: 1,
      backgroundOpacity: 0.2,
      noFillBackgroundOpacity: 0.3,
      noDuotoneBackgroundOpacity: 0
    },
    fill: {
      color: "#000000",
      reverse: "#FFFFFF",
      lineOpacity: 0,
      duotoneLineOpacity: 0.6,
      noFillLineOpacity: 0,
      noDuotoneLineOpacity: 1,
      onlyFillLineOpacity: 1,
      onlyDuotoneLineOpacity: 0,
      backgroundOpacity: 0.8,
      noFillBackgroundOpacity: 0,
      noDuotoneBackgroundOpacity: 0.9
    }
  },
  weights: weightProfiles,
  rendering: {
    duotoneFillOpacity: 0.2,
    fillFillOpacity: 1
  },
  modes: ["outline", "fill", "duotone"]
};

export const demoAccentOpacity = config.rendering?.duotoneFillOpacity ?? 0.2;

const geometryMaterializer = createPaperGeometryMaterializer({
  weights: config.weights ?? {}
});

const compilations = Object.entries(svgFixtures)
  .map(([filePath, svg]) => {
    const fileName = filePath.split("/").at(-1);
    if (fileName === undefined) {
      throw new Error(`Invalid SVG fixture path: ${filePath}`);
    }

    const name = fileName.slice(0, -4);
    return {
      name,
      result: compileSymbol({
        name,
        sources: [
          {
            weight: SymbolWeight.Ultralight,
            targetWeights: demoWeights,
            fileName,
            svg
          }
        ],
        config,
        geometryMaterializer
      })
    };
  })
  .sort((left, right) => left.name.localeCompare(right.name));

export const demoSymbols: readonly SymbolIr[] = compilations.flatMap(({ result }) =>
  result.symbol === undefined ? [] : [result.symbol]
);
export const demoDiagnostics: readonly CompileDiagnostic[] = compilations.flatMap(
  ({ name, result }) =>
    result.diagnostics.map((diagnostic) => ({
      ...diagnostic,
      message: `${name}: ${diagnostic.message}`
    }))
);
