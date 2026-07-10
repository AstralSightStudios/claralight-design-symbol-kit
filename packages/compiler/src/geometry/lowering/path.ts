import type { PathAst, PathCommand } from "../../ast/index.js";
import type { GeometryPath, GeometryPathCommand, GeometryPoint } from "../types.js";

const ORIGIN: GeometryPoint = { x: 0, y: 0 };

export function lowerPathAst(path: PathAst): GeometryPath {
  const commands: GeometryPathCommand[] = [];
  let currentPoint: GeometryPoint | undefined;
  let subpathStart: GeometryPoint | undefined;

  for (const command of path.commands) {
    switch (command.type) {
      case "move": {
        const point = resolvePoint(command.point, command.relative, currentPoint ?? ORIGIN);
        commands.push({ type: "move", point });
        currentPoint = point;
        subpathStart = point;
        break;
      }
      case "line": {
        const start = requireCurrentPoint(currentPoint, command);
        const point = resolvePoint(command.point, command.relative, start);
        commands.push({ type: "line", point });
        currentPoint = point;
        break;
      }
      case "horizontalLine": {
        const start = requireCurrentPoint(currentPoint, command);
        const point = {
          x: command.relative ? start.x + command.x : command.x,
          y: start.y
        };
        commands.push({ type: "line", point });
        currentPoint = point;
        break;
      }
      case "verticalLine": {
        const start = requireCurrentPoint(currentPoint, command);
        const point = {
          x: start.x,
          y: command.relative ? start.y + command.y : command.y
        };
        commands.push({ type: "line", point });
        currentPoint = point;
        break;
      }
      case "cubicCurve": {
        const start = requireCurrentPoint(currentPoint, command);
        const controlPoint1 = resolvePoint(command.controlPoint1, command.relative, start);
        const controlPoint2 = resolvePoint(command.controlPoint2, command.relative, start);
        const point = resolvePoint(command.point, command.relative, start);
        commands.push({ type: "cubic", controlPoint1, controlPoint2, point });
        currentPoint = point;
        break;
      }
      case "quadraticCurve": {
        const start = requireCurrentPoint(currentPoint, command);
        const controlPoint = resolvePoint(command.controlPoint, command.relative, start);
        const point = resolvePoint(command.point, command.relative, start);
        commands.push({
          type: "cubic",
          controlPoint1: interpolateQuadraticControl(start, controlPoint),
          controlPoint2: interpolateQuadraticControl(point, controlPoint),
          point
        });
        currentPoint = point;
        break;
      }
      case "close":
        if (subpathStart === undefined) {
          throw new TypeError("Path close command requires an active subpath.");
        }
        commands.push({ type: "close" });
        currentPoint = subpathStart;
        break;
      case "smoothCubicCurve":
      case "smoothQuadraticCurve":
      case "arc":
        throw new TypeError(`Unsupported Path AST command for geometry lowering: ${command.type}.`);
    }
  }

  return { commands };
}

function resolvePoint(
  point: GeometryPoint,
  relative: boolean,
  origin: GeometryPoint
): GeometryPoint {
  return relative ? { x: origin.x + point.x, y: origin.y + point.y } : { x: point.x, y: point.y };
}

function interpolateQuadraticControl(
  endpoint: GeometryPoint,
  controlPoint: GeometryPoint
): GeometryPoint {
  return {
    x: endpoint.x + (2 / 3) * (controlPoint.x - endpoint.x),
    y: endpoint.y + (2 / 3) * (controlPoint.y - endpoint.y)
  };
}

function requireCurrentPoint(
  currentPoint: GeometryPoint | undefined,
  command: PathCommand
): GeometryPoint {
  if (currentPoint === undefined) {
    throw new TypeError(`Path ${command.type} command requires a current point.`);
  }

  return currentPoint;
}
