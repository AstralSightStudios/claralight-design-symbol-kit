export type CliLanguage = "en" | "zh";

export interface BuildStageText {
  readonly active: string;
  readonly complete: string;
  readonly pending: string;
}

export interface CliText {
  readonly building: string;
  readonly built: string;
  readonly cancelled: string;
  readonly failed: string;
  readonly error: string;
  readonly completed: string;
  readonly duration: (value: string) => string;
  readonly icons: string;
  readonly skipped: string;
  readonly output: string;
  readonly stages: readonly BuildStageText[];
  readonly unknownStage: (index: number) => string;
  readonly usage: string;
  readonly generationFailed: (failures: string) => string;
  readonly sameFlutterOutput: string;
  readonly invalidInput: (path: string) => string;
  readonly emptyInput: (path: string) => string;
  readonly invalidArguments: string;
  readonly missingOption: (name: string) => string;
  readonly configReadFailed: (path: string, message: string) => string;
  readonly invalidConfig: (path: string, message: string) => string;
  readonly missingNormalStyle: string;
  readonly invalidStyleToken: (mode: string, name: string) => string;
  readonly unknownWeightMode: (mode: string) => string;
  readonly invalidStrokeWidth: (mode: string) => string;
  readonly emptyTokenDirectory: (directory: string) => string;
  readonly missingModeName: string;
}

const translations: Record<CliLanguage, CliText> = {
  en: {
    building: "Building Symbol Kit.",
    built: "Symbol Kit build completed.",
    cancelled: "Symbol Kit build cancelled.",
    failed: "Symbol Kit build failed.",
    error: "Error",
    completed: "Build completed",
    duration: (value) => `in ${value}s`,
    icons: "Icons",
    skipped: "Skipped",
    output: "Output",
    stages: [
      {
        active: "Reading SVG and tokens…",
        complete: "SVG and tokens read",
        pending: "Waiting to read SVG and tokens"
      },
      {
        active: "Compiling SVG…",
        complete: "SVG compiled",
        pending: "Waiting to compile SVG"
      },
      {
        active: "Writing build artifacts…",
        complete: "Build artifacts written",
        pending: "Waiting to write build artifacts"
      }
    ],
    unknownStage: (index) => `Unknown build stage: ${String(index)}`,
    usage:
      "Usage: clsk-cli build [zh] --input <svg> --width-tokens <directory> --style-tokens <directory> --out-dir <directory> [--config <file>] [--name <name>] [--flutter-assets-dir <directory>]",
    generationFailed: (failures) => `SVG generation failed:\n${failures}`,
    sameFlutterOutput: "--flutter-assets-dir cannot be the same as --out-dir.",
    invalidInput: (path) => `Build input must be an SVG file or directory: ${path}`,
    emptyInput: (path) => `No SVG files found in build directory: ${path}`,
    invalidArguments: "Build options must use the --option value format.",
    missingOption: (name) => `Missing required build option: --${name}`,
    configReadFailed: (path, message) => `Unable to read config file ${path}: ${message}`,
    invalidConfig: (path, message) => `Invalid config file ${path}: ${message}`,
    missingNormalStyle: "Missing required Style tokens mode: normal",
    invalidStyleToken: (mode, name) => `${mode} tokens must include a valid Fill.${name}.`,
    unknownWeightMode: (mode) => `Unknown Width tokens mode: ${mode}`,
    invalidStrokeWidth: (mode) => `Width tokens mode ${mode} must include a valid Stroke Width.`,
    emptyTokenDirectory: (directory) =>
      `No .tokens.json files found in tokens directory: ${directory}`,
    missingModeName: "Token file is missing com.figma.modeName."
  },
  zh: {
    building: "Symbol Kit 构建中。",
    built: "Symbol Kit 构建完成。",
    cancelled: "Symbol Kit 构建已取消。",
    failed: "Symbol Kit 构建失败。",
    error: "错误",
    completed: "构建完成",
    duration: (value) => `用时 ${value} 秒`,
    icons: "图标",
    skipped: "跳过",
    output: "输出",
    stages: [
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
    ],
    unknownStage: (index) => `未知构建阶段：${String(index)}`,
    usage:
      "用法：clsk-cli build [zh] --input <svg> --width-tokens <目录> --style-tokens <目录> --out-dir <目录> [--config <文件>] [--name <名称>] [--flutter-assets-dir <目录>]",
    generationFailed: (failures) => `SVG 生成失败：\n${failures}`,
    sameFlutterOutput: "--flutter-assets-dir 不能与 --out-dir 相同。",
    invalidInput: (path) => `构建输入必须是 SVG 文件或目录：${path}`,
    emptyInput: (path) => `构建目录中没有 SVG 文件：${path}`,
    invalidArguments: "构建参数必须使用 --参数 值 的格式。",
    missingOption: (name) => `缺少构建参数：--${name}`,
    configReadFailed: (path, message) => `无法读取配置文件 ${path}：${message}`,
    invalidConfig: (path, message) => `配置文件 ${path} 无效：${message}`,
    missingNormalStyle: "缺少必需的 Style tokens 模式：normal",
    invalidStyleToken: (mode, name) => `${mode} tokens 缺少有效的 Fill.${name}。`,
    unknownWeightMode: (mode) => `无法识别 Width tokens 模式：${mode}`,
    invalidStrokeWidth: (mode) => `Width tokens 模式 ${mode} 缺少有效的 Stroke Width。`,
    emptyTokenDirectory: (directory) => `tokens 目录中没有 .tokens.json 文件：${directory}`,
    missingModeName: "tokens 文件缺少 com.figma.modeName。"
  }
};

export function resolveCliLanguage(args: readonly string[]): {
  readonly language: CliLanguage;
  readonly args: readonly string[];
} {
  const language = args.includes("zh") || args.includes("--zh") ? "zh" : "en";
  return {
    language,
    args: args.filter((argument) => argument !== "zh" && argument !== "--zh")
  };
}

export function getCliText(language: CliLanguage): CliText {
  return translations[language];
}
