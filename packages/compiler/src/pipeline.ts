import type { SymbolIr, SymbolWeight } from "@claralight-design/symbol-kit-core";

export interface CompileSymbolSource {
  readonly weight: SymbolWeight;
  readonly fileName: string;
  readonly svg: string;
}

export interface CompileSymbolInput {
  readonly name: string;
  readonly sources: readonly CompileSymbolSource[];
}

export interface CompileSymbolOptions {
  readonly generatedAt?: Date;
}

export interface CompileSymbolResult {
  readonly ir: SymbolIr;
}
