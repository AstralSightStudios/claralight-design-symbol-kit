import type { SymbolIr, SymbolWeight } from "@claralight-design/symbol-kit-core";

import type { SourceSvgAst } from "./ast/index.js";
import { classifySourceSvgAst } from "./classifier/index.js";
import { resolveCompilerConfig, type CompilerConfigInput } from "./config/index.js";
import type { GeometryMaterializer } from "./geometry/index.js";
import { createSymbolIr, type SymbolIrVariantInput } from "./ir/index.js";
import { normalizeSourceSvgAst } from "./normalize/index.js";
import { parseSvgSource } from "./parser/index.js";
import { compileRendering } from "./rendering/index.js";

export interface CompileAstSource {
  readonly weight: SymbolWeight;
  readonly source: SourceSvgAst;
}

export interface CompileSvgSource {
  readonly weight: SymbolWeight;
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

export type CompileDiagnosticSeverity = "warning" | "error";

export interface CompileDiagnostic {
  readonly severity: CompileDiagnosticSeverity;
  readonly code: string;
  readonly message: string;
}

export interface CompileResult {
  readonly symbol: SymbolIr;
  readonly diagnostics: readonly CompileDiagnostic[];
}

export type CompileSymbolInput = CompileInput;
export type CompileSymbolResult = CompileResult;

export function compileSymbol(input: CompileInput): CompileResult {
  const geometryMaterializer = requireGeometryMaterializer(input.geometryMaterializer);
  const config = resolveCompilerConfig(input.config === undefined ? {} : { project: input.config });
  const variants = input.sources.flatMap((source) => {
    const parsed = parseCompileSource(input.name, source);
    const normalized = normalizeSourceSvgAst(parsed);
    const semantic = classifySourceSvgAst(normalized, config);

    return config.modes.map((mode): SymbolIrVariantInput => {
      const rendering = compileRendering(semantic, mode, config);

      return {
        weight: source.weight,
        rendering,
        geometry: geometryMaterializer.materialize({
          weight: source.weight,
          rendering
        })
      };
    });
  });

  return {
    symbol: createSymbolIr({
      name: input.name,
      variants
    }),
    diagnostics: []
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
