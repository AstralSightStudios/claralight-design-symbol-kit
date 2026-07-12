import type { SymbolIr, SymbolWeight } from "@claralight-design/symbol-kit-core";

import type { SourceSvgAst } from "./ast/index.js";
import { classifySourceSvgAstWithDiagnostics, inferSymbolWeight } from "./classifier/index.js";
import { resolveCompilerConfig, type CompilerConfigInput } from "./config/index.js";
import type { CompileDiagnostic } from "./diagnostics.js";
import {
  createPaperGeometryMaterializer,
  lowerRenderingGeometry,
  type GeometryMaterializer
} from "./geometry/index.js";
import { createSymbolIr, type SymbolIrVariantInput } from "./ir/index.js";
import { normalizeSourceSvgAst } from "./normalize/index.js";
import { parseSvgSource } from "./parser/index.js";
import { compileRendering } from "./rendering/index.js";

export interface CompileAstSource {
  readonly weight?: SymbolWeight;
  readonly targetWeights?: readonly SymbolWeight[];
  readonly source: SourceSvgAst;
}

export interface CompileSvgSource {
  readonly weight?: SymbolWeight;
  readonly targetWeights?: readonly SymbolWeight[];
  readonly fileName: string;
  readonly svg: string;
}

export type CompileSymbolSource = CompileAstSource | CompileSvgSource;

export interface CompileInput {
  readonly name: string;
  readonly sources: readonly CompileSymbolSource[];
  readonly config?: CompilerConfigInput;
  readonly geometryMaterializer?: GeometryMaterializer;
}

export interface CompileResult {
  readonly symbol?: SymbolIr;
  readonly diagnostics: readonly CompileDiagnostic[];
}

export type CompileSymbolInput = CompileInput;
export type CompileSymbolResult = CompileResult;

export interface CompileSvgSymbolInput {
  readonly name: string;
  readonly svg: string;
  readonly config?: CompilerConfigInput;
  readonly sourceWeight?: SymbolWeight;
  readonly targetWeights?: readonly SymbolWeight[];
}

export function compileSvgSymbol(input: CompileSvgSymbolInput): CompileResult {
  const config = resolveCompilerConfig(input.config === undefined ? {} : { project: input.config });
  return compileSymbol({
    name: input.name,
    ...(input.config === undefined ? {} : { config: input.config }),
    geometryMaterializer: createPaperGeometryMaterializer({ weights: config.weights }),
    sources: [
      {
        fileName: `${input.name}.svg`,
        svg: input.svg,
        ...(input.sourceWeight === undefined ? {} : { weight: input.sourceWeight }),
        ...(input.targetWeights === undefined ? {} : { targetWeights: input.targetWeights })
      }
    ]
  });
}

export function compileSymbol(input: CompileInput): CompileResult {
  const geometryMaterializer = requireGeometryMaterializer(input.geometryMaterializer);
  const config = resolveCompilerConfig(input.config === undefined ? {} : { project: input.config });
  const diagnostics: CompileDiagnostic[] = [];
  const variants: SymbolIrVariantInput[] = [];

  for (const source of input.sources) {
    const parsed = parseCompileSource(input.name, source);
    const normalized = normalizeSourceSvgAst(parsed);
    const classification = classifySourceSvgAstWithDiagnostics(normalized, config);
    const weightResult =
      source.weight === undefined
        ? inferSymbolWeight(normalized, config)
        : { weight: source.weight, diagnostics: [] };
    const sourceDiagnostics = [...classification.diagnostics, ...weightResult.diagnostics];
    diagnostics.push(...sourceDiagnostics);

    if (sourceDiagnostics.some((diagnostic) => diagnostic.severity === "error")) {
      continue;
    }

    const sourceWeight = weightResult.weight;
    if (sourceWeight === undefined) {
      continue;
    }

    const compiledModes = config.modes.map((mode) => {
      const rendering = compileRendering(classification.semantic, mode, config);
      return { rendering, lowered: lowerRenderingGeometry(rendering) };
    });

    for (const weight of resolveTargetWeights(sourceWeight, source.targetWeights)) {
      for (const { rendering, lowered } of compiledModes) {
        variants.push({
          weight,
          rendering,
          geometry: geometryMaterializer.materialize({
            sourceWeight,
            weight,
            rendering,
            lowered
          })
        });
      }
    }
  }

  return variants.length === 0
    ? { diagnostics }
    : {
        symbol: createSymbolIr({
          name: input.name,
          variants
        }),
        diagnostics
      };
}

function resolveTargetWeights(
  sourceWeight: SymbolWeight,
  targetWeights: readonly SymbolWeight[] | undefined
): readonly SymbolWeight[] {
  if (targetWeights === undefined) {
    return [sourceWeight];
  }
  if (targetWeights.length === 0) {
    throw new TypeError("Compile source targetWeights must contain at least one weight.");
  }

  const uniqueWeights = new Set(targetWeights);
  if (uniqueWeights.size !== targetWeights.length) {
    throw new TypeError("Compile source targetWeights must not contain duplicate weights.");
  }

  return targetWeights;
}

function parseCompileSource(name: string, source: CompileSymbolSource): SourceSvgAst {
  if ("source" in source) {
    return source.source;
  }

  return parseSvgSource({
    name,
    svg: source.svg
  });
}

export type { CompileDiagnostic, CompileDiagnosticSeverity } from "./diagnostics.js";

function requireGeometryMaterializer(
  materializer: GeometryMaterializer | undefined
): GeometryMaterializer {
  if (materializer === undefined) {
    throw new Error(
      "Geometry materializer is required because no geometry backend is implemented."
    );
  }

  return materializer;
}
