# 图标生成管线修复与架构整合总结

日期：2026-07-17 ｜ 分支：`k3-0716test` ｜ 提交：`7eabc23`

## 问题现象

CLI 跑完生成的图标"变烂"：部分图标元素丢失，显示效果与 Figma 原稿不一致。典型如 `CaretCircleDown`，Normal 输出只剩一个圆圈，中间的白色对勾消失。

## 根因

项目里存在**两条平行的 SVG 生成管线**：

| 管线 | 使用方 | 状态 |
| --- | --- | --- |
| 旧 `generateFigmaSvgSet`（`packages/compiler/src/generator/index.ts`） | CLI 生成 SVG 文件 | ✗ 有 bug |
| 新 Symbol IR 管线（`compileSymbol` → core `renderSvg`） | demo、`symbol.json` | ✓ 正确 |

旧管线的图层筛选只收 `role === "primary" | "line"` 的 path，**漏掉了反白 cutout 描边**（`isReverseCutoutStrokePath`，例如白色描边的对勾、箭头）。这类元素在 Normal/Duotone 输出中全部丢失；Fill 模式因为走减法路径反而正常。

影响面：全部 113 个测试图标中 **27 个**含白色描边（所有 `ArrowCircle*`、`ArrowSquare*`、`CaretCircle*` 系列），Normal/Duotone 输出均缺元素。

## 修复方案：架构收敛

删掉旧管线的手写渲染逻辑，让 SVG 生成只有**单一事实来源**：

```
test/*.svg → compileSvgSymbol（单次编译）─┬→ createCompiledSymbol → .symbol.json
                                          └→ generateSymbolSvgFiles → renderSvg → 各权重/样式 SVG
```

### 改动文件

1. **`packages/compiler/src/generator/index.ts`**（重写）
   - `generateFigmaSvgSet` 变为 IR 管线薄封装：`resolveCompilerConfig` → `compileSvgSymbol` → `generateSymbolSvgFiles`
   - 删除约 170 行手写 paper.js 渲染代码
   - 新增导出 `generateSymbolSvgFiles(symbol, { accentOpacity })`，供 CLI 复用同一 IR 产出 SVG
   - 公开 API 形状不变（`GenerateFigmaSvgSetInput/Result`、`GeneratedFigmaSvg`）
2. **`packages/cli/src/index.ts`**
   - 每个图标只编译一次；此前 `generateFigmaSvgSet` 与 `compileSvgSymbol` 各跑一遍
   - SVG 文件与 `symbol.json` 现在同源，杜绝再次发散
3. **`packages/compiler/src/index.ts`**
   - 导出 `generateSymbolSvgFiles` 与 `GenerateSymbolSvgFilesOptions`
4. **`packages/compiler/src/__tests__/figma-svg-generator.test.ts`**
   - 断言更新为 canonical 输出格式：Fill 图层为 `data-symbol-layer="primary"`（原 `foreground`）；`duotone-line` 独立图层取消，并入 primary；根节点 `fill="currentColor"`
   - 新增回归测试 `keeps reverse cutout strokes in outline and duotone output`（CaretCircleDown：normal=2 paths、duotone=3、fill=1），已实证该测试在旧代码上必然失败

## 验证

- `vitest run`：**102/102 通过**（17 个测试文件）
- `tsc -b` 全仓通过；`packages/compiler`、`packages/cli` eslint 0 错误（`apps/demo` 有 14 个既存 lint 错误，与本次无关）
- 全量重建 113 个测试图标：110 个成功；逐张渲染 PNG 与原稿比对（CaretCircleDown、CaretCircleDoubleDown、ArrowCircleDown、ArrowSquareUp、ArrowClockwise、ArrowArcLeft、CreditCard、VectorThree 等），Normal/Duotone/Fill 三样式均与原稿一致
- 线宽精度：UltraLight 输出与原稿同为 0.625 单位（渲染测量），Regular 为 2.188（≈2.2 token）
- 独立审计（fresh-context auditor）：**PASS**，0 BLOCKER / 0 MAJOR / 3 MINOR；两条 MINOR（空 weights 诊断、accentOpacity 注释）已当场修复复验

## 输出格式契约（今后以 core `renderSvg` 为准）

- 图层只有 `data-symbol-layer="primary" | "accent"`
- Duotone accent 层带 `opacity`（默认 0.2，来自 `rendering.duotoneFillOpacity`）
- 根 `<svg>` 带 `fill="currentColor"`；`<path>` 只有 `fill-rule="evenodd"`

## 遗留事项（既存问题，本次未改动）

- 纯填充无描边图标（`Recycle`、`WindowsLogo`、`CreatorConsoleLogo`）无法推断字重，批量构建会整体失败；需要设计层面的决策（例如显式指定源字重或跳过字重展开）
- `apps/demo` 存在 14 个既存 lint 错误
