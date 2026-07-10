import type { PathAst, PathCommand } from "../ast/index.js";

const NUMBER_PATTERN = /^[+-]?(?:\d+\.\d*|\.\d+|\d+)(?:[eE][+-]?\d+)?/;

interface CommandToken {
  readonly kind: "command";
  readonly value: string;
  readonly position: number;
}

interface NumberToken {
  readonly kind: "number";
  readonly value: number;
  readonly position: number;
}

type PathToken = CommandToken | NumberToken;

export function parsePathData(pathData: string): PathAst {
  if (pathData.trim().length === 0) {
    throw new TypeError("SVG path data must not be empty.");
  }

  const reader = new PathTokenReader(tokenizePathData(pathData));
  const commands: PathCommand[] = [];
  let activeCommand: string | undefined;
  let isFirstCommand = true;

  while (!reader.isAtEnd()) {
    const next = reader.peek();
    if (next?.kind === "command") {
      activeCommand = reader.readCommand();
    } else if (activeCommand === undefined) {
      throw new SyntaxError(
        `SVG path command expected at position ${String(next?.position ?? 0)}.`
      );
    }

    if (isFirstCommand && activeCommand.toUpperCase() !== "M") {
      throw new SyntaxError("SVG path data must begin with a move command.");
    }

    const relative = activeCommand === activeCommand.toLowerCase();
    const command = activeCommand.toUpperCase();

    switch (command) {
      case "M": {
        const groups = reader.readParameterGroups(activeCommand, 2);
        groups.forEach(([x, y], index) => {
          commands.push({
            type: index === 0 ? "move" : "line",
            relative,
            point: { x: requireNumber(x), y: requireNumber(y) }
          });
        });
        activeCommand = relative ? "l" : "L";
        break;
      }
      case "L":
        reader.readParameterGroups(activeCommand, 2).forEach(([x, y]) => {
          commands.push({
            type: "line",
            relative,
            point: { x: requireNumber(x), y: requireNumber(y) }
          });
        });
        break;
      case "H":
        reader.readParameterGroups(activeCommand, 1).forEach(([x]) => {
          commands.push({
            type: "horizontalLine",
            relative,
            x: requireNumber(x)
          });
        });
        break;
      case "V":
        reader.readParameterGroups(activeCommand, 1).forEach(([y]) => {
          commands.push({
            type: "verticalLine",
            relative,
            y: requireNumber(y)
          });
        });
        break;
      case "C":
        reader.readParameterGroups(activeCommand, 6).forEach(([x1, y1, x2, y2, x, y]) => {
          commands.push({
            type: "cubicCurve",
            relative,
            controlPoint1: { x: requireNumber(x1), y: requireNumber(y1) },
            controlPoint2: { x: requireNumber(x2), y: requireNumber(y2) },
            point: { x: requireNumber(x), y: requireNumber(y) }
          });
        });
        break;
      case "Q":
        reader.readParameterGroups(activeCommand, 4).forEach(([x1, y1, x, y]) => {
          commands.push({
            type: "quadraticCurve",
            relative,
            controlPoint: { x: requireNumber(x1), y: requireNumber(y1) },
            point: { x: requireNumber(x), y: requireNumber(y) }
          });
        });
        break;
      case "Z":
        commands.push({ type: "close" });
        activeCommand = undefined;
        break;
      case "A":
        throw new SyntaxError(`SVG path arc commands are not supported: ${activeCommand}.`);
      default:
        throw new SyntaxError(`Unsupported SVG path command: ${activeCommand}.`);
    }

    isFirstCommand = false;
  }

  return { commands };
}

class PathTokenReader {
  private index = 0;

  constructor(private readonly tokens: readonly PathToken[]) {}

  isAtEnd(): boolean {
    return this.index >= this.tokens.length;
  }

  peek(): PathToken | undefined {
    return this.tokens[this.index];
  }

  readCommand(): string {
    const token = this.tokens[this.index];
    if (token?.kind !== "command") {
      throw new SyntaxError(
        `SVG path command expected at position ${String(token?.position ?? 0)}.`
      );
    }

    this.index += 1;
    return token.value;
  }

  readParameterGroups(command: string, parameterCount: number): readonly (readonly number[])[] {
    const groups: number[][] = [];

    while (this.peek()?.kind === "number") {
      const group: number[] = [];
      for (let index = 0; index < parameterCount; index += 1) {
        const token = this.tokens[this.index];
        if (token?.kind !== "number") {
          throw new SyntaxError(
            `SVG path command ${command} requires parameter groups of ${String(parameterCount)}.`
          );
        }

        group.push(token.value);
        this.index += 1;
      }
      groups.push(group);
    }

    if (groups.length === 0) {
      throw new SyntaxError(
        `SVG path command ${command} requires parameter groups of ${String(parameterCount)}.`
      );
    }

    return groups;
  }
}

function tokenizePathData(pathData: string): readonly PathToken[] {
  const tokens: PathToken[] = [];
  let position = 0;

  while (position < pathData.length) {
    const character = pathData[position];
    if (character === undefined) {
      break;
    }

    if (/[\s,]/u.test(character)) {
      position += 1;
      continue;
    }

    if (/[A-Za-z]/u.test(character)) {
      tokens.push({ kind: "command", value: character, position });
      position += 1;
      continue;
    }

    const match = NUMBER_PATTERN.exec(pathData.slice(position));
    if (match === null) {
      throw new SyntaxError(
        `Unexpected SVG path character "${character}" at position ${String(position)}.`
      );
    }

    const value = Number(match[0]);
    if (!Number.isFinite(value)) {
      throw new SyntaxError(`Invalid SVG path number at position ${String(position)}.`);
    }

    tokens.push({ kind: "number", value, position });
    position += match[0].length;
  }

  return tokens;
}

function requireNumber(value: number | undefined): number {
  if (value === undefined) {
    throw new SyntaxError("SVG path command is missing a required parameter.");
  }

  return value;
}
