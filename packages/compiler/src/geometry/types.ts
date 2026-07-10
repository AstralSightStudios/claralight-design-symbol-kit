export interface GeometryPoint {
  readonly x: number;
  readonly y: number;
}

export interface GeometryMoveCommand {
  readonly type: "move";
  readonly point: GeometryPoint;
}

export interface GeometryLineCommand {
  readonly type: "line";
  readonly point: GeometryPoint;
}

export interface GeometryCubicCommand {
  readonly type: "cubic";
  readonly controlPoint1: GeometryPoint;
  readonly controlPoint2: GeometryPoint;
  readonly point: GeometryPoint;
}

export interface GeometryCloseCommand {
  readonly type: "close";
}

export type GeometryPathCommand =
  GeometryMoveCommand | GeometryLineCommand | GeometryCubicCommand | GeometryCloseCommand;

export interface GeometryPath {
  readonly commands: readonly GeometryPathCommand[];
}

export interface GeometryRegion {
  readonly paths: readonly GeometryPath[];
}
