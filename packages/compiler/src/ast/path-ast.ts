import type { SymbolPoint } from "@claralight-design/symbol-kit-core";

export interface PathMoveCommand {
  readonly type: "move";
  readonly relative: boolean;
  readonly point: SymbolPoint;
}

export interface PathLineCommand {
  readonly type: "line";
  readonly relative: boolean;
  readonly point: SymbolPoint;
}

export interface PathHorizontalLineCommand {
  readonly type: "horizontalLine";
  readonly relative: boolean;
  readonly x: number;
}

export interface PathVerticalLineCommand {
  readonly type: "verticalLine";
  readonly relative: boolean;
  readonly y: number;
}

export interface PathCubicCurveCommand {
  readonly type: "cubicCurve";
  readonly relative: boolean;
  readonly controlPoint1: SymbolPoint;
  readonly controlPoint2: SymbolPoint;
  readonly point: SymbolPoint;
}

export interface PathSmoothCubicCurveCommand {
  readonly type: "smoothCubicCurve";
  readonly relative: boolean;
  readonly controlPoint2: SymbolPoint;
  readonly point: SymbolPoint;
}

export interface PathQuadraticCurveCommand {
  readonly type: "quadraticCurve";
  readonly relative: boolean;
  readonly controlPoint: SymbolPoint;
  readonly point: SymbolPoint;
}

export interface PathSmoothQuadraticCurveCommand {
  readonly type: "smoothQuadraticCurve";
  readonly relative: boolean;
  readonly point: SymbolPoint;
}

export interface PathArcCommand {
  readonly type: "arc";
  readonly relative: boolean;
  readonly radius: SymbolPoint;
  readonly xAxisRotation: number;
  readonly largeArc: boolean;
  readonly sweep: boolean;
  readonly point: SymbolPoint;
}

export interface PathCloseCommand {
  readonly type: "close";
}

export type PathCommand =
  | PathMoveCommand
  | PathLineCommand
  | PathHorizontalLineCommand
  | PathVerticalLineCommand
  | PathCubicCurveCommand
  | PathSmoothCubicCurveCommand
  | PathQuadraticCurveCommand
  | PathSmoothQuadraticCurveCommand
  | PathArcCommand
  | PathCloseCommand;

export interface PathAst {
  readonly commands: readonly PathCommand[];
}
