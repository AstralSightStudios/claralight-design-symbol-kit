import type { SymbolIr, SymbolWeight } from "@claralight-design/symbol-kit-core";

import type { SourceSvgAst } from "./ast/index.js";
import { classifySourceSvgAstWithDiagnostics, inferSymbolWeight } from "./classifier/index.js";
import { resolveCompilerConfig, type CompilerConfigInput } from "./config/index.js";
import type { CompileDiagnostic } from "./diagnostics.js";
import { lowerRenderingGeometry, type GeometryMaterializer } from "./geometry/index.js";
import { createSymbolIr, type SymbolIrVariantInput } from "./ir/index.js";
import { normalizeSourceSvgAst } from "./normalize/index.js";
import { parseSvgSource } from "./parser/index.js";
import { compileRendering } from "./rendering/index.js";

export interface CompileAstSource {
  readonly weight?: SymbolWeight;
  readonly source: SourceSvgAst;
}

export interface CompileSvgSource {
  readonly weight?: SymbolWeight;
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

    const weight = weightResult.weight;
    if (weight === undefined) {
      continue;
    }

    for (const mode of config.modes) {
      const rendering = compileRendering(classification.semantic, mode, config);
      const lowered = lowerRenderingGeometry(rendering);
      variants.push({
        weight,
        rendering,
        geometry: geometryMaterializer.materialize({
          weight,
          rendering,
          lowered
        })
      });
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
