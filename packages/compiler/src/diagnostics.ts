export type CompileDiagnosticSeverity = "warning" | "error";

export interface CompileDiagnostic {
  readonly severity: CompileDiagnosticSeverity;
  readonly code: string;
  readonly message: string;
}
