import { clearScreenDown, cursorTo, moveCursor } from "node:readline";

import { color, label } from "@astrojs/cli-kit";

import { getCliText, type CliLanguage, type CliText } from "./i18n.js";

const BRAND = "Claralight";
const ANIMATION_COLORS = [
  "#3640FC",
  "#2387F1",
  "#3DA9A3",
  "#47DA93",
  "#883AE3",
  "#5711F8",
  "#6B22EF",
  "#7B30E7"
] as const;
const PROGRESS_WIDTH = BRAND.length + 2;
const BUILD_STAGE_COUNT = 3;
const STAGE_VIEWPORT_SIZE = BUILD_STAGE_COUNT * 2 - 1;
const ACTIVE_STAGE_ROW = BUILD_STAGE_COUNT - 1;
const PROGRESS_LINE_COUNT = STAGE_VIEWPORT_SIZE + 3;
const MINIMUM_ANIMATED_STAGE_DURATION = 160;

interface AnimatedProgress {
  readonly start: () => void;
  readonly setActive: (index: number) => void;
  readonly update: (current: number, total: number) => void;
  readonly complete: (index: number) => void;
  readonly clear: () => void;
}

export const BuildStage = {
  input: 0,
  compile: 1,
  output: 2
} as const;

export interface BuildSummary {
  readonly symbolCount: number;
  readonly svgCount: number;
  readonly skippedCount: number;
  readonly outDir: string;
}

export interface BuildReporter {
  readonly start: () => void;
  readonly runStep: <T>(index: number, action: () => Promise<T> | T) => Promise<T>;
  readonly update: (current: number, total: number) => void;
  readonly finish: (summary: BuildSummary) => void;
  readonly fail: (error: unknown) => void;
  readonly cancel: () => void;
}

export function createBuildReporter(language: CliLanguage): BuildReporter {
  const text = getCliText(language);
  const startedAt = Date.now();
  let activeProgress: AnimatedProgress | undefined;

  function log(message = ""): void {
    process.stdout.write(`${message}\n`);
  }

  function clear(): void {
    activeProgress?.clear();
    activeProgress = undefined;
  }

  return {
    start() {
      if (canAnimate()) {
        activeProgress = createAnimatedProgress(() => {
          activeProgress = undefined;
        }, text);
        activeProgress.start();
        return;
      }
      log(`\n${label(BRAND, color.bgGreen, color.black)}  ${color.bold(text.building)}\n`);
    },
    async runStep<T>(index: number, action: () => Promise<T> | T): Promise<T> {
      const stage = requireBuildStage(index, text);
      if (activeProgress === undefined) {
        log(`${" ".repeat(5)} ${color.cyan("●")}  ${stage.active}`);
        const result = await action();
        log(`${" ".repeat(5)} ${color.green("✔")}  ${color.green(stage.complete)}`);
        return result;
      }

      const progress = activeProgress;
      progress.setActive(index);
      const result = await action();
      await wait(MINIMUM_ANIMATED_STAGE_DURATION);
      progress.complete(index);
      return result;
    },
    update(current, total) {
      activeProgress?.update(current, total);
    },
    finish(summary) {
      clear();
      const duration = ((Date.now() - startedAt) / 1000).toFixed(1);
      log(`\n${label(BRAND, color.bgGreen, color.black)}  ${color.bold(text.built)}\n`);
      log(
        `${" ".repeat(5)} ${color.green("✔")}  ${color.green(text.completed)} ${color.dim(text.duration(duration))}`
      );
      log(`${" ".repeat(9)}${color.dim(text.icons)} ${String(summary.symbolCount)}`);
      log(`${" ".repeat(9)}${color.dim("SVG")} ${String(summary.svgCount)}`);
      log(`${" ".repeat(9)}${color.dim("Symbol JSON")} ${String(summary.symbolCount)}`);
      if (summary.skippedCount > 0) {
        log(`${" ".repeat(9)}${color.dim(text.skipped)} ${String(summary.skippedCount)}`);
      }
      log(`${" ".repeat(9)}${color.dim(text.output)} ${summary.outDir}\n`);
    },
    fail(error) {
      clear();
      const message = readErrorMessage(error).replaceAll("\n", `\n${" ".repeat(9)}`);
      process.stderr.write(
        `\n${label(BRAND, color.bgRed)}  ${color.bold(text.failed)}\n\n${" ".repeat(5)} ${color.red("▲")}  ${color.red(text.error)} ${color.dim(message)}\n\n`
      );
    },
    cancel() {
      clear();
      process.stderr.write(
        `\n${label(BRAND, color.bgYellow, color.black)}  ${color.bold(text.cancelled)}\n\n`
      );
    }
  };
}

function canAnimate(): boolean {
  return process.stdin.isTTY && process.stdout.isTTY && process.stdout.columns >= 48;
}

function createAnimatedProgress(onClear: () => void, text: CliText): AnimatedProgress {
  let activeStage = 0;
  let stageComplete = false;
  let stageProgress: { readonly current: number; readonly total: number } | undefined;
  let frame = 0;
  let rendered = false;
  let timer: NodeJS.Timeout | undefined;

  function gradientRow(): string {
    return Array.from({ length: PROGRESS_WIDTH }, (_, column) => {
      const colorIndex = (column + frame) % ANIMATION_COLORS.length;
      const value = ANIMATION_COLORS[colorIndex];
      return value === undefined ? "█" : color.hex(value)("█");
    }).join("");
  }

  function stageMessage(index: number): string {
    const stage = requireBuildStage(index, text);
    if (index < activeStage || (index === activeStage && stageComplete)) {
      return color.green(`✔  ${stage.complete}`);
    }
    if (index === activeStage) {
      const progress =
        stageProgress === undefined
          ? ""
          : ` (${String(stageProgress.current)}/${String(stageProgress.total)})`;
      return color.cyan(`▶  ${stage.active}${progress}`);
    }
    return color.dim(`□  ${stage.pending}`);
  }

  function stageRow(row: number): string {
    const stageIndex = activeStage + row - ACTIVE_STAGE_ROW;
    const progress = row === ACTIVE_STAGE_ROW ? gradientRow() : " ".repeat(PROGRESS_WIDTH);
    const message =
      stageIndex >= 0 && stageIndex < text.stages.length ? stageMessage(stageIndex) : "";
    return `${progress}  ${message}`;
  }

  function erase(): void {
    if (!rendered) {
      return;
    }
    moveCursor(process.stdout, 0, -PROGRESS_LINE_COUNT);
    cursorTo(process.stdout, 0);
    clearScreenDown(process.stdout);
    rendered = false;
  }

  function render(): void {
    erase();
    const lines = [
      "",
      `${label(BRAND, color.bgGreen, color.black)}  ${color.bold(text.building)}`,
      "",
      ...Array.from({ length: STAGE_VIEWPORT_SIZE }, (_, row) => stageRow(row))
    ];
    process.stdout.write(`${lines.join("\n")}\n`);
    rendered = true;
    frame = (frame + 1) % ANIMATION_COLORS.length;
  }

  return {
    start() {
      process.stdout.write("\u001B[?25l");
      render();
      timer = setInterval(render, 80);
    },
    setActive(index) {
      requireBuildStage(index, text);
      activeStage = index;
      stageComplete = false;
      stageProgress = undefined;
      render();
    },
    update(current, total) {
      stageProgress = { current, total };
      render();
    },
    complete(index) {
      requireBuildStage(index, text);
      activeStage = index;
      stageComplete = true;
      stageProgress = undefined;
      render();
    },
    clear() {
      if (timer !== undefined) {
        clearInterval(timer);
      }
      erase();
      process.stdout.write("\u001B[?25h");
      onClear();
    }
  };
}

function requireBuildStage(index: number, text: CliText) {
  const stage = text.stages[index];
  if (stage === undefined) {
    throw new Error(text.unknownStage(index));
  }
  return stage;
}

function readErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function wait(duration: number): Promise<void> {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, duration);
  });
}
