#!/usr/bin/env node

import { appendFile, mkdir, readFile, stat } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";
import { fileURLToPath } from "node:url";

const DEFAULT_CONFIG = resolve(dirname(fileURLToPath(import.meta.url)), "../modules.config.json");
const ANSI = {
  clear: "\u001b[2J\u001b[H",
  enterScreen: "\u001b[?1049h",
  leaveScreen: "\u001b[?1049l",
  hideCursor: "\u001b[?25l",
  showCursor: "\u001b[?25h",
  reset: "\u001b[0m",
  inverse: "\u001b[7m",
  cyan: "\u001b[36m",
  green: "\u001b[32m",
  yellow: "\u001b[33m",
  gray: "\u001b[90m"
};

async function main() {
  const options = parseArguments(process.argv.slice(2));

  if (options.command === "help") {
    printHelp();
    return;
  }

  ensureGitAvailable();
  const workspace = await loadWorkspace(options.configPath);
  const modules = selectModules(workspace.modules, options.moduleName);

  switch (options.command) {
    case "init":
      await initializeModules(workspace.root, modules);
      return;
    case "sync":
      await syncModules(workspace.root, modules);
      return;
    case "status":
      await showStatus(modules);
      return;
    case "tui":
      await runTui(workspace.root, modules);
      return;
    default:
      throw new Error(`未知命令：${options.command}`);
  }
}

function parseArguments(args) {
  let command = process.stdin.isTTY && process.stdout.isTTY ? "tui" : "status";
  let hasCommand = false;
  let configPath = DEFAULT_CONFIG;
  let moduleName;

  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];

    if (value === "-h" || value === "--help") {
      command = "help";
      continue;
    }
    if (value === "-c" || value === "--config") {
      configPath = resolve(requireArgument(args, ++index, value));
      continue;
    }
    if (value === "-m" || value === "--module") {
      moduleName = requireArgument(args, ++index, value);
      continue;
    }
    if (!value.startsWith("-") && !hasCommand) {
      command = value;
      hasCommand = true;
      continue;
    }

    throw new Error(`无法识别的参数：${value}`);
  }

  return { command, configPath, moduleName };
}

function requireArgument(args, index, option) {
  const value = args[index];
  if (value === undefined || value.startsWith("-")) {
    throw new Error(`${option} 缺少参数值。`);
  }
  return value;
}

async function loadWorkspace(configPath) {
  let config;
  try {
    config = JSON.parse(await readFile(configPath, "utf8"));
  } catch (error) {
    throw new Error(`无法读取配置文件 ${configPath}：${formatError(error)}`);
  }

  if (config?.version !== 1 || !Array.isArray(config.modules)) {
    throw new Error("模块配置必须包含 version: 1 和 modules 数组。");
  }

  const root = dirname(configPath);
  const names = new Set();
  const paths = new Set();
  const modules = config.modules.map((input, index) => {
    if (typeof input?.name !== "string" || input.name.trim().length === 0) {
      throw new Error(`modules[${String(index)}].name 必须是非空字符串。`);
    }
    if (typeof input.path !== "string" || input.path.trim().length === 0) {
      throw new Error(`modules[${String(index)}].path 必须是非空字符串。`);
    }

    const name = input.name.trim();
    const inputPath = normalizeConfiguredPath(input.path);
    const path = resolve(root, inputPath);
    const configuredPath = relative(root, path).split(sep).join("/");
    const branch = readOptionalString(input.branch, "main", `modules[${String(index)}].branch`);
    const url = readOptionalString(input.url, undefined, `modules[${String(index)}].url`);

    assertInsideWorkspace(root, path, inputPath);
    if (runGit(["check-ref-format", "--branch", branch], root, true, true).status !== 0) {
      throw new Error(`模块 ${name} 的分支名无效：${branch}`);
    }
    if (url?.startsWith("-") === true) {
      throw new Error(`模块 ${name} 的 url 无效：${url}`);
    }
    if (names.has(name)) {
      throw new Error(`模块名称重复：${name}`);
    }
    if (paths.has(configuredPath)) {
      throw new Error(`模块路径重复：${configuredPath}`);
    }

    names.add(name);
    paths.add(configuredPath);
    return { name, configuredPath, path, branch, url };
  });

  return { root, modules };
}

function normalizeConfiguredPath(value) {
  const normalized = value.trim().replaceAll("\\", "/").replace(/^\.\//u, "");
  if (isAbsolute(normalized) || normalized === "" || normalized === ".") {
    throw new Error(`模块路径必须是工作区内的相对路径：${value}`);
  }
  return normalized;
}

function readOptionalString(value, fallback, label) {
  if (value === undefined) {
    return fallback;
  }
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} 必须是非空字符串。`);
  }
  return value.trim();
}

function assertInsideWorkspace(root, path, configuredPath) {
  const pathFromRoot = relative(root, path);
  if (pathFromRoot === "" || pathFromRoot === ".." || pathFromRoot.startsWith(`..${sep}`)) {
    throw new Error(`模块路径超出工作区：${configuredPath}`);
  }
}

function selectModules(modules, moduleName) {
  if (moduleName === undefined) {
    return modules;
  }

  const normalized = moduleName.toLowerCase();
  const selected = modules.filter(
    (module) =>
      module.name.toLowerCase() === normalized || module.configuredPath.toLowerCase() === normalized
  );

  if (selected.length === 0) {
    throw new Error(`配置中没有模块：${moduleName}`);
  }
  return selected;
}

async function initializeModules(root, modules) {
  await ensureRootIgnore(root, modules);
  await detachModulesFromRoot(root, modules);

  for (const module of modules) {
    if (await isGitRepository(module.path)) {
      await configureExistingRepository(module);
      print(`已配置 ${module.name}：${module.configuredPath}`);
      continue;
    }

    if (module.url !== undefined) {
      await mkdir(dirname(module.path), { recursive: true });
      runGit(["clone", "--branch", module.branch, module.url, module.path], root);
      print(`已克隆 ${module.name}：${module.configuredPath}`);
      continue;
    }

    await mkdir(module.path, { recursive: true });
    runGit(["init", "-b", module.branch], module.path);
    print(`已初始化 ${module.name}：${module.configuredPath}`);
  }
}

async function configureExistingRepository(module) {
  if (module.url !== undefined) {
    const remote = runGit(["remote", "get-url", "origin"], module.path, true, true);
    if (remote.status === 0) {
      if (remote.stdout.trim() !== module.url) {
        runGit(["remote", "set-url", "origin", module.url], module.path);
      }
    } else {
      runGit(["remote", "add", "origin", module.url], module.path);
    }
  }

  const head = runGit(["symbolic-ref", "--quiet", "--short", "HEAD"], module.path, true, true);
  if (head.status !== 0) {
    runGit(["symbolic-ref", "HEAD", `refs/heads/${module.branch}`], module.path);
  }
}

async function syncModules(root, modules) {
  await initializeModules(root, modules);

  for (const module of modules) {
    if (module.url === undefined) {
      print(`跳过 ${module.name}：未配置 url`);
      continue;
    }

    runGit(["fetch", "origin", "--prune"], module.path);
    const dirty = runGit(["status", "--porcelain"], module.path, true).stdout.trim();
    if (dirty.length > 0) {
      print(`跳过 ${module.name} 更新：存在未提交修改`);
      continue;
    }

    checkoutConfiguredBranch(module);
    runGit(["pull", "--ff-only", "origin", module.branch], module.path);
    print(`已同步 ${module.name}：${module.branch}`);
  }
}

function checkoutConfiguredBranch(module) {
  const local = runGit(
    ["show-ref", "--verify", "--quiet", `refs/heads/${module.branch}`],
    module.path,
    true,
    true
  );
  if (local.status === 0) {
    runGit(["checkout", module.branch], module.path);
    return;
  }

  const remote = runGit(
    ["show-ref", "--verify", "--quiet", `refs/remotes/origin/${module.branch}`],
    module.path,
    true,
    true
  );
  if (remote.status !== 0) {
    throw new Error(`${module.name} 找不到分支 origin/${module.branch}。`);
  }

  runGit(["checkout", "-b", module.branch, "--track", `origin/${module.branch}`], module.path);
}

async function showStatus(modules) {
  const statuses = await collectModuleStatuses(modules);
  for (const status of statuses) {
    if (!status.initialized) {
      print(`${status.module.name}  未初始化  ${status.module.configuredPath}`);
      continue;
    }
    print(
      `${status.module.name}  ${status.branch}  ${status.dirty ? "有修改" : "干净"}  ${formatRemoteName(status.remote)}`
    );
  }
}

async function collectModuleStatuses(modules) {
  return Promise.all(modules.map(collectModuleStatus));
}

async function collectModuleStatus(module) {
  if (!(await isGitRepository(module.path))) {
    return {
      module,
      initialized: false,
      branch: "—",
      remote: module.url ?? "未配置远程",
      dirty: false,
      changeCount: 0
    };
  }

  const branch = readGitValue(["branch", "--show-current"], module.path) || "未提交";
  const remote = readGitValue(["remote", "get-url", "origin"], module.path) || "未配置远程";
  const changes = readGitValue(["status", "--porcelain"], module.path);
  const changeCount = changes.length === 0 ? 0 : changes.split("\n").length;

  return {
    module,
    initialized: true,
    branch,
    remote,
    dirty: changeCount > 0,
    changeCount
  };
}

async function runTui(root, modules) {
  if (!process.stdin.isTTY || !process.stdout.isTTY || process.stdin.setRawMode === undefined) {
    await showStatus(modules);
    return;
  }

  let statuses = await collectModuleStatuses(modules);
  let selectedIndex = 0;
  let showDetails = true;
  let busy = false;
  let message = "就绪";
  let finish;
  let inputQueue = Promise.resolve();

  const completion = new Promise((resolveCompletion) => {
    finish = resolveCompletion;
  });

  const render = () => {
    process.stdout.write(renderTuiScreen(statuses, selectedIndex, showDetails, message, busy));
  };

  const activate = () => {
    process.stdout.write(`${ANSI.enterScreen}${ANSI.hideCursor}`);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on("data", handleInput);
    process.stdout.on("resize", render);
  };

  const deactivate = () => {
    process.stdin.off("data", handleInput);
    process.stdout.off("resize", render);
    process.stdin.setRawMode(false);
    process.stdin.pause();
    process.stdout.write(`${ANSI.showCursor}${ANSI.leaveScreen}`);
  };

  const refresh = async () => {
    statuses = await collectModuleStatuses(modules);
    selectedIndex = Math.min(selectedIndex, Math.max(0, statuses.length - 1));
  };

  const execute = async (label, targets, operation) => {
    busy = true;
    message = `${label}中…`;
    render();
    deactivate();

    try {
      await operation(root, targets);
      message = `${label}完成`;
    } catch (error) {
      message = `${label}失败：${formatError(error)}`;
    } finally {
      await refresh();
      busy = false;
      activate();
      render();
    }
  };

  async function handleKey(key) {
    if (key === "q" || key === "\u0003") {
      finish();
      return;
    }
    if (busy || statuses.length === 0) {
      return;
    }

    if (key === "\u001b[A" || key === "k") {
      selectedIndex = (selectedIndex - 1 + statuses.length) % statuses.length;
      render();
      return;
    }
    if (key === "\u001b[B" || key === "j") {
      selectedIndex = (selectedIndex + 1) % statuses.length;
      render();
      return;
    }
    if (key === "\r" || key === "d") {
      showDetails = !showDetails;
      render();
      return;
    }
    if (key === "r") {
      busy = true;
      message = "刷新中…";
      render();
      await refresh();
      busy = false;
      message = "状态已刷新";
      render();
      return;
    }

    const selected = statuses[selectedIndex]?.module;
    if (selected === undefined) {
      return;
    }
    if (key === "i") {
      await execute("初始化", [selected], initializeModules);
      return;
    }
    if (key === "I") {
      await execute("全部初始化", modules, initializeModules);
      return;
    }
    if (key === "s") {
      await execute("同步", [selected], syncModules);
      return;
    }
    if (key === "S") {
      await execute("全部同步", modules, syncModules);
    }
  }

  function handleInput(data) {
    for (const key of parseInputKeys(data.toString())) {
      inputQueue = inputQueue
        .then(() => handleKey(key))
        .catch((error) => {
          busy = false;
          message = `操作失败：${formatError(error)}`;
          render();
        });
    }
  }

  try {
    activate();
    render();
    await completion;
  } finally {
    deactivate();
  }
}

function parseInputKeys(value) {
  const keys = [];
  for (let index = 0; index < value.length;) {
    const sequence = value.slice(index, index + 3);
    if (sequence === "\u001b[A" || sequence === "\u001b[B") {
      keys.push(sequence);
      index += 3;
      continue;
    }

    const codePoint = value.codePointAt(index);
    const key = String.fromCodePoint(codePoint ?? 0);
    keys.push(key);
    index += key.length;
  }
  return keys;
}

function renderTuiScreen(statuses, selectedIndex, showDetails, message, busy) {
  const width = Math.max(48, Math.min(process.stdout.columns ?? 96, 120));
  const initialized = statuses.filter((status) => status.initialized).length;
  const dirty = statuses.filter((status) => status.dirty).length;
  const selected = statuses[selectedIndex];
  const lines = [
    style(borderTitle("Symbol Kit · 模块子仓库", width), ANSI.cyan),
    frameLine(
      `模块 ${String(statuses.length)}   已初始化 ${String(initialized)}   有修改 ${String(dirty)}   未初始化 ${String(statuses.length - initialized)}`,
      width
    ),
    borderDivider(width),
    frameLine(moduleTableHeader(width), width)
  ];

  for (const [index, status] of statuses.entries()) {
    lines.push(
      frameLine(
        moduleTableRow(status, width, index === selectedIndex),
        width,
        index === selectedIndex
      )
    );
  }

  if (statuses.length === 0) {
    lines.push(frameLine("配置中没有模块", width));
  }

  if (showDetails && selected !== undefined) {
    lines.push(borderDivider(width));
    lines.push(frameLine(`路径    ${selected.module.configuredPath}`, width));
    lines.push(frameLine(`分支    ${selected.branch}`, width));
    lines.push(frameLine(`远程    ${selected.remote}`, width));
    lines.push(
      frameLine(
        `状态    ${selected.initialized ? (selected.dirty ? `有 ${String(selected.changeCount)} 项修改` : "干净") : "未初始化"}`,
        width
      )
    );
  }

  lines.push(borderDivider(width));
  lines.push(frameLine(`${busy ? "◌" : "●"} ${message}`, width));
  lines.push(frameLine("↑↓/jk 选择   Enter/d 详情   i 初始化   s 同步   r 刷新   q 退出", width));
  lines.push(frameLine("I 全部初始化   S 全部同步", width));
  lines.push(borderBottom(width));

  return `${ANSI.clear}${lines.join("\n")}\n`;
}

function moduleTableHeader(width) {
  if (width < 82) {
    return `  ${tableCell("模块", 20)} ${tableCell("分支", 12)} 状态`;
  }
  return `  ${tableCell("模块", 20)} ${tableCell("分支", 12)} ${tableCell("状态", 14)} 远程`;
}

function moduleTableRow(status, width, selected) {
  const marker = selected ? "❯" : " ";
  const state = status.initialized
    ? status.dirty
      ? `有修改 ${String(status.changeCount)}`
      : "干净"
    : "未初始化";

  if (width < 82) {
    return `${marker} ${tableCell(status.module.name, 20)} ${tableCell(status.branch, 12)} ${state}`;
  }
  return `${marker} ${tableCell(status.module.name, 20)} ${tableCell(status.branch, 12)} ${tableCell(state, 14)} ${formatRemoteName(status.remote)}`;
}

function tableCell(value, width) {
  return padDisplay(truncateDisplay(value, width), width);
}

function frameLine(value, width, selected = false) {
  const innerWidth = width - 2;
  const content = padDisplay(` ${truncateDisplay(value, innerWidth - 2)} `, innerWidth);
  return `│${selected ? ANSI.inverse : ""}${content}${selected ? ANSI.reset : ""}│`;
}

function borderTitle(title, width) {
  const label = `─ ${title} `;
  return `┌${label}${"─".repeat(Math.max(0, width - displayWidth(label) - 2))}┐`;
}

function borderDivider(width) {
  return `├${"─".repeat(width - 2)}┤`;
}

function borderBottom(width) {
  return `└${"─".repeat(width - 2)}┘`;
}

function truncateDisplay(value, width) {
  if (displayWidth(value) <= width) {
    return value;
  }

  let output = "";
  let used = 0;
  for (const character of value) {
    const characterWidth = displayCharacterWidth(character);
    if (used + characterWidth > width - 1) {
      break;
    }
    output += character;
    used += characterWidth;
  }
  return `${output}…`;
}

function padDisplay(value, width) {
  return `${value}${" ".repeat(Math.max(0, width - displayWidth(value)))}`;
}

function displayWidth(value) {
  return [...value].reduce((total, character) => total + displayCharacterWidth(character), 0);
}

function displayCharacterWidth(character) {
  const codePoint = character.codePointAt(0) ?? 0;
  return codePoint >= 0x1100 &&
    (codePoint <= 0x115f ||
      codePoint === 0x2329 ||
      codePoint === 0x232a ||
      (codePoint >= 0x2e80 && codePoint <= 0xa4cf) ||
      (codePoint >= 0xac00 && codePoint <= 0xd7a3) ||
      (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
      (codePoint >= 0xfe10 && codePoint <= 0xfe6f) ||
      (codePoint >= 0xff00 && codePoint <= 0xff60) ||
      (codePoint >= 0xffe0 && codePoint <= 0xffe6) ||
      codePoint >= 0x1f300)
    ? 2
    : 1;
}

function style(value, code) {
  return process.env.NO_COLOR === undefined ? `${code}${value}${ANSI.reset}` : value;
}

async function ensureRootIgnore(root, modules) {
  const ignorePath = resolve(root, ".gitignore");
  const current = (await pathExists(ignorePath)) ? await readFile(ignorePath, "utf8") : "";
  const lines = new Set(current.split(/\r?\n/u));
  const additions = modules
    .map((module) => `/${module.configuredPath}/`)
    .filter((line) => !lines.has(line));

  if (additions.length === 0) {
    return;
  }

  const prefix = current.length === 0 || current.endsWith("\n") ? "" : "\n";
  await appendFile(ignorePath, `${prefix}\n# 模块子仓库\n${additions.join("\n")}\n`, "utf8");
  print(`已更新 .gitignore：${String(additions.length)} 项`);
}

async function detachModulesFromRoot(root, modules) {
  if (!(await isGitRepository(root))) {
    return;
  }

  for (const module of modules) {
    const tracked = runGit(["ls-files", "--", module.configuredPath], root, true).stdout.trim();
    if (tracked.length === 0) {
      continue;
    }
    runGit(["rm", "--cached", "-r", "--", module.configuredPath], root);
    print(`已从主仓解除追踪：${module.configuredPath}`);
  }
}

async function isGitRepository(path) {
  if (!(await pathExists(path))) {
    return false;
  }
  const result = runGit(["rev-parse", "--show-toplevel"], path, true, true);
  return result.status === 0 && resolve(result.stdout.trim()) === resolve(path);
}

async function pathExists(path) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

function readGitValue(args, cwd) {
  const result = runGit(args, cwd, true, true);
  return result.status === 0 ? result.stdout.trim() : "";
}

function runGit(args, cwd, capture = false, allowFailure = false) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit"
  });

  if (result.error !== undefined) {
    throw result.error;
  }
  if (result.status !== 0 && !allowFailure) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(`git ${args.join(" ")} 执行失败${detail.length > 0 ? `：\n${detail}` : "。"}`);
  }

  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? ""
  };
}

function ensureGitAvailable() {
  const result = spawnSync("git", ["--version"], { encoding: "utf8" });
  if (result.error !== undefined || result.status !== 0) {
    throw new Error("未找到 Git，请先安装 Git。");
  }
}

function printHelp() {
  process.stdout.write(`Symbol Kit 模块子仓库工具

用法：
  pnpm modules <command> [options]

命令：
  init      更新主仓忽略规则，初始化或克隆模块仓库
  sync      抓取并快进同步已配置 url 的模块
  status    查看模块分支、工作区和远程状态
  tui       打开交互式模块管理界面，交互终端下默认进入
  help      显示帮助

选项：
  -c, --config <file>   指定配置文件
  -m, --module <name>   只处理指定模块，可使用 name 或 path
`);
}

function formatRemoteName(remote) {
  const match = remote.match(/\/([^/]+?)(?:\.git)?$/);
  return match ? match[1] : remote;
}

function print(message) {
  process.stdout.write(`${message}\n`);
}

function formatError(error) {
  return error instanceof Error ? error.message : String(error);
}

main().catch((error) => {
  process.stderr.write(`${formatError(error)}\n`);
  process.exitCode = 1;
});
