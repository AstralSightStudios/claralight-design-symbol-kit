import { clearScreenDown, cursorTo, moveCursor } from "node:readline";

import { color, label } from "@astrojs/cli-kit";

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
const BUILD_STAGES = [
  {
    active: "正在读取 SVG 与 Token…",
    complete: "SVG 与 Token 读取完成",
    pending: "等待读取 SVG 与 Token"
  },
  {
    active: "正在编译 SVG…",
    complete: "SVG 编译完成",
    pending: "等待编译 SVG"
  },
  {
    active: "正在写入构建产物…",
    complete: "构建产物写入完成",
    pending: "等待写入构建产物"
  }
] as const;
const PROGRESS_LINE_COUNT = 4;
const MINIMUM_ANIMATED_STAGE_DURATION = 160;

interface AnimatedProgress {
  readonly start: () => void;
  readonly setActive: (index: number) => void;
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
  readonly finish: (summary: BuildSummary) => void;
  readonly fail: (error: unknown) => void;
  readonly cancel: () => void;
}

export function createBuildReporter(): BuildReporter {
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
        });
        activeProgress.start();
        return;
      }
      log(`\n${label(BRAND, color.bgGreen, color.black)}  ${color.bold("Symbol Kit 构建中。")}\n`);
    },
    async runStep<T>(index: number, action: () => Promise<T> | T): Promise<T> {
      const stage = requireBuildStage(index);
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
    finish(summary) {
      clear();
      const duration = ((Date.now() - startedAt) / 1000).toFixed(1);
      log(
        `\n${label(BRAND, color.bgGreen, color.black)}  ${color.bold("Symbol Kit 构建完成。")}\n`
      );
      log(
        `${" ".repeat(5)} ${color.green("✔")}  ${color.green("构建完成")} ${color.dim(`用时 ${duration} 秒`)}`
      );
      log(`${" ".repeat(9)}${color.dim("图标")} ${String(summary.symbolCount)}`);
      log(`${" ".repeat(9)}${color.dim("SVG")} ${String(summary.svgCount)}`);
      log(`${" ".repeat(9)}${color.dim("Symbol JSON")} ${String(summary.symbolCount)}`);
      if (summary.skippedCount > 0) {
        log(`${" ".repeat(9)}${color.dim("跳过")} ${String(summary.skippedCount)}`);
      }
      log(`${" ".repeat(9)}${color.dim("输出")} ${summary.outDir}\n`);
    },
    fail(error) {
      clear();
      const message = readErrorMessage(error).replaceAll("\n", `\n${" ".repeat(9)}`);
      process.stderr.write(
        `\n${label(BRAND, color.bgRed)}  ${color.bold("Symbol Kit 构建失败。")}\n\n${" ".repeat(5)} ${color.red("▲")}  ${color.red("错误")} ${color.dim(message)}\n\n`
      );
    },
    cancel() {
      clear();
      process.stderr.write(
        `\n${label(BRAND, color.bgYellow, color.black)}  ${color.bold("Symbol Kit 构建已取消。")}\n\n`
      );
    }
  };
}

function canAnimate(): boolean {
  return process.stdin.isTTY && process.stdout.isTTY && process.stdout.columns >= 48;
}

function createAnimatedProgress(onClear: () => void): AnimatedProgress {
  let activeStage = 0;
  let stageComplete = false;
  let frame = 0;
  let rendered = false;
  let timer: NodeJS.Timeout | undefined;

  function gradientRow(): string {
    return Array.from({ length: 8 }, (_, column) => {
      const colorIndex = (column + frame) % ANIMATION_COLORS.length;
      const value = ANIMATION_COLORS[colorIndex];
      return value === undefined ? "█" : color.hex(value)("█");
    }).join("");
  }

  function stageMessage(): string {
    const stage = requireBuildStage(activeStage);
    if (stageComplete) {
      return color.green(`✔  ${stage.complete}`);
    }
    return color.cyan(`▶  ${stage.active}`);
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
      `${label(BRAND, color.bgGreen, color.black)}  ${color.bold("Symbol Kit 构建中。")}`,
      "",
      `${gradientRow()}  ${stageMessage()}`
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
      requireBuildStage(index);
      activeStage = index;
      stageComplete = false;
      render();
    },
    complete(index) {
      requireBuildStage(index);
      activeStage = index;
      stageComplete = true;
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

function requireBuildStage(index: number): (typeof BUILD_STAGES)[number] {
  const stage = BUILD_STAGES[index];
  if (stage === undefined) {
    throw new Error(`未知构建阶段：${String(index)}`);
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
