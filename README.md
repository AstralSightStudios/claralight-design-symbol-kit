# Symbol Kit

Symbol Kit 用于把 Figma 导出的 SVG 源文件和 Design Token JSON 编译为多字重、多样式的 SVG 图标集。当前可生成 `Normal`、`Fill` 和 `Duotone` 三种样式。

## 环境要求

- Node.js 22 或更高版本
- pnpm

```bash
pnpm install
pnpm build
```

## 快速使用

编译单个 SVG：

```bash
node packages/cli/dist/index.js build \
  --input test/CreditCard.svg \
  --width-tokens test/Width \
  --style-tokens test/Style \
  --out-dir output/CreditCard \
  --name CreditCard
```

批量编译目录下的 SVG：

```bash
node packages/cli/dist/index.js build \
  --input test \
  --width-tokens test/Width \
  --style-tokens test/Style \
  --out-dir output
```

`--input` 可以是单个 `.svg` 文件，也可以是目录。目录模式只读取该目录第一层的 `.svg` 文件，不会递归扫描。`--name` 仅用于单文件模式；不传时使用文件名作为图标名。

| 参数             | 是否必填 | 说明                                   |
| ---------------- | -------- | -------------------------------------- |
| `--input`        | 是       | SVG 文件或 SVG 目录                    |
| `--width-tokens` | 是       | 字重 Token 目录                        |
| `--style-tokens` | 是       | 样式 Token 目录                        |
| `--out-dir`      | 是       | 生成目录；已有的同名图标目录会先被清理 |
| `--name`         | 否       | 单文件模式下覆盖图标名                 |

## Token 配置

CLI 从两个目录读取以 `.tokens.json` 结尾的 JSON 文件。文件名可以自定义，模式名以 `$extensions.com.figma.modeName` 为准。

### Width Tokens

每个字重一个文件，必须包含 `Width.Stroke Width.$value`：

```json
{
  "Width": {
    "Stroke Width": {
      "$type": "number",
      "$value": 2.2
    }
  },
  "$extensions": {
    "com.figma.modeName": "Regular"
  }
}
```

CLI 可识别的模式名为 `UltraLight`、`Thin`、`Light`、`Regular` 和 `Medium`。`$value` 必须是大于 `0` 的数字，并与源 SVG 中的 `stroke-width` 对应。

### Style Tokens

至少要提供 `Normal`、`Duotone` 和 `Fill` 三个模式。每个模式一个文件，结构如下：

```json
{
  "Fill": {
    "Color": { "$value": { "hex": "#000000" } },
    "Reverse": { "$value": { "hex": "#FFFFFF" } },
    "Line Opacity": { "$value": 0 },
    "Duotone Line Opacity": { "$value": 60 },
    "BG Opacity": { "$value": 80 },
    "NoFill BG Opacity": { "$value": 0 },
    "NoDuo BG Opacity": { "$value": 90 }
  },
  "$extensions": {
    "com.figma.modeName": "Fill"
  }
}
```

| 字段                   | 含义                              |
| ---------------------- | --------------------------------- |
| `Color`                | 前景色，读取 `$value.hex`         |
| `Reverse`              | 反色或挖空颜色，读取 `$value.hex` |
| `Line Opacity`         | 普通线条透明度                    |
| `Duotone Line Opacity` | 双色线条透明度                    |
| `BG Opacity`           | 背景层透明度                      |
| `NoFill BG Opacity`    | 不进入 Fill 样式的背景层透明度    |
| `NoDuo BG Opacity`     | 不进入 Duotone 样式的背景层透明度 |

透明度 Token 使用 `0` 到 `100` 的百分数。CLI 会转换为编译器使用的 `0` 到 `1`。可直接参考 [`test/Width`](./test/Width) 和 [`test/Style`](./test/Style) 中的完整配置。

## SVG 源文件约定

- 根节点必须是 `<svg>`，并提供有效的 `viewBox`。
- 图形使用 `<path>`；线条宽度要能匹配 Width Tokens 中的一个字重。
- 颜色应与 Style Tokens 中的 `Color` 或 `Reverse` 一致。
- 透明度用来区分普通线条、双色线条和不同背景层，应与 Style Tokens 中的对应值一致。
- 未配置的颜色、透明度或线宽会产生错误诊断，CLI 不会写入该批产物。

需要显式标注语义时，可以给 path 设置以 `sk-` 开头的 `id`：

| ID 段          | 语义                               |
| -------------- | ---------------------------------- |
| `line`         | 普通线条                           |
| `duotone-line` | 双色线条                           |
| `bg`           | 背景层                             |
| `bg-no-fill`   | 不进入 Fill 的背景层               |
| `bg-no-duo`    | 不进入 Duotone 的背景层            |
| `reverse`      | 反色修饰符，可用 `--` 与其他段组合 |

例如：`sk-line`、`sk-bg--reverse`。

## 生成结果

单个图标的目录结构如下：

```text
output/CreditCard/
├── UltraLight/
│   ├── Normal.svg
│   ├── Fill.svg
│   └── Duotone.svg
├── Regular/
│   └── ...
└── manifest.json
```

批量模式会再按图标名创建一层目录，并在输出根目录生成总 `manifest.json`。每个图标目录也有自己的 `manifest.json`。

## 编程接口

需要在 TypeScript 中直接生成 SVG 集时，可使用 `generateFigmaSvgSet`：

```ts
import { readFile } from "node:fs/promises";
import {
  generateFigmaSvgSet,
  type CompilerConfigInput
} from "@claralight-design/symbol-kit-compiler";

const config: CompilerConfigInput = {
  colors: {
    foreground: ["#000000"],
    background: ["#FFFFFF"]
  },
  styles: {
    normal: {
      color: "#000000",
      reverse: "#000000",
      lineOpacity: 1,
      duotoneLineOpacity: 0,
      backgroundOpacity: 0,
      noFillBackgroundOpacity: 0,
      noDuotoneBackgroundOpacity: 0
    },
    duotone: {
      color: "#000000",
      reverse: "#000000",
      lineOpacity: 0,
      duotoneLineOpacity: 0.7,
      backgroundOpacity: 0.2,
      noFillBackgroundOpacity: 0.3,
      noDuotoneBackgroundOpacity: 0
    },
    fill: {
      color: "#000000",
      reverse: "#FFFFFF",
      lineOpacity: 0,
      duotoneLineOpacity: 0.6,
      backgroundOpacity: 0.8,
      noFillBackgroundOpacity: 0,
      noDuotoneBackgroundOpacity: 0.9
    }
  },
  weights: {
    ultralight: { strokeWidth: 0.6 },
    regular: { strokeWidth: 2.2 }
  },
  modes: ["outline", "fill", "duotone"]
};

const svg = await readFile("icons/CreditCard.svg", "utf8");
const result = generateFigmaSvgSet({ name: "CreditCard", svg, config });

if (result.diagnostics.some(({ severity }) => severity === "error")) {
  throw new Error(JSON.stringify(result.diagnostics, null, 2));
}

for (const file of result.files) {
  console.log(file.fileName, file.svg);
}
```

编程接口的所有透明度都使用 `0` 到 `1`。配置合并顺序为 `global` → `project` → `cli`，后一层覆盖前一层：

```ts
import { resolveCompilerConfig } from "@claralight-design/symbol-kit-compiler";

const config = resolveCompilerConfig({
  global: { rendering: { duotoneFillOpacity: 0.2 } },
  project: { stroke: { strokeLinecap: "round", strokeLinejoin: "round" } },
  cli: { modes: ["outline", "duotone"] }
});
```

完整配置项：

| 配置                           | 可选值或默认值                   | 用途                                          |
| ------------------------------ | -------------------------------- | --------------------------------------------- |
| `colors.foreground`            | `[]`                             | 可识别的前景颜色列表；空列表表示不限制前景色  |
| `colors.background`            | `[]`                             | 可识别的背景或反色列表                        |
| `opacity.full`                 | `1`                              | 主要图层的完全不透明值                        |
| `opacity.tolerance`            | `0.001`                          | 判定透明度相等时允许的误差                    |
| `opacity.secondaryThreshold`   | `1`                              | 未配置样式档位时，识别次要图层的阈值          |
| `outline.foreground`           | `drop` / `convert-to-background` | Outline 模式如何处理前景填充                  |
| `styles`                       | `{}`                             | 按样式名配置颜色与各语义透明度                |
| `weights`                      | `{}`                             | 按字重名配置 `strokeWidth` 和可选 `tolerance` |
| `rendering.duotoneFillOpacity` | `0.2`                            | Duotone 输出的辅助色填充透明度                |
| `rendering.fillFillOpacity`    | `1`                              | Fill 输出的填充透明度                         |
| `semanticIds`                  | `sk-` 前缀、`--` 分隔符          | 自定义 SVG path ID 的语义解析规则             |
| `stroke.strokeLinecap`         | `butt` / `round` / `square`      | 统一覆盖源 SVG 的线帽                         |
| `stroke.strokeLinejoin`        | `miter` / `round` / `bevel`      | 统一覆盖源 SVG 的连接样式                     |
| `modes`                        | `outline` / `fill` / `duotone`   | 选择要生成的样式，默认全部生成                |

## 项目结构

| 目录                | 用途                               |
| ------------------- | ---------------------------------- |
| `packages/core`     | 平台无关的 Symbol IR 和字重定义    |
| `packages/compiler` | SVG 解析、语义分类、几何处理与渲染 |
| `packages/cli`      | 命令行批量生成工具                 |
| `packages/unplugin` | 构建工具集成                       |
| `apps/demo`         | React 预览和调试应用               |

## 框架子仓库

`packages/react` 和 `packages/vue` 是独立 Git 仓库，不由主仓库追踪，也不参与主工作区的 pnpm workspace 和 TypeScript project references。两个目录已在主仓库 `.gitignore` 中忽略，需要分别配置自己的远程地址、版本和发布流程。

在子仓库中查看状态：

```bash
git -C packages/react status
git -C packages/vue status
```

主仓库克隆时不会自动带上这两个目录；它们不是 Git submodule，需要作为独立仓库分别克隆到对应路径。

## 开发命令

```bash
pnpm test
pnpm lint
pnpm build
pnpm demo
```

`pnpm build:credit-card` 可用于生成单个示例，`pnpm build:icons` 可批量生成 `test` 目录中的全部图标。
