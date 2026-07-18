# Claralight Symbol Kit CLI

Command-line SVG and Design Token compiler for Claralight Symbol Kit.

```bash
pnpm add -D @claralight-design/symbol-kit-cli

pnpm clsk-cli build \
  --input icons \
  --width-tokens tokens/Width \
  --style-tokens tokens/Style \
  --out-dir output
```

The CLI uses English by default. Add the `zh` argument for Simplified Chinese output:

```bash
pnpm clsk-cli build zh \
  --input icons \
  --width-tokens tokens/Width \
  --style-tokens tokens/Style \
  --out-dir output
```

`clsymbol-kit-cli` and `symbol-kit` remain available as command aliases.

Full documentation is available in the [Symbol Kit repository](https://github.com/AstralSightStudios/claralight-design-symbol-kit#readme).
