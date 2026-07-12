import {
  createSymbolRenderModel,
  SymbolWeight,
  type CompiledSymbol,
  type SymbolVariantKind
} from "@claralight-design/symbol-kit-core";
import { startTransition, useEffect, useRef, useState } from "react";

type Framework = "astro" | "react" | "vue";
type SymbolModule = Record<string, CompiledSymbol>;
type Loader = () => Promise<SymbolModule>;

const modules = import.meta.glob<SymbolModule>(
  "../../../../packages/core/src/symbols/!(*index).ts"
);
const catalog = Object.entries(modules)
  .map(([path, load]) => ({ name: path.split("/").at(-1)?.replace(".ts", "") ?? "", load }))
  .filter(({ name }) => name.length > 0)
  .sort((a, b) => a.name.localeCompare(b.name));

const frameworks: readonly Framework[] = ["astro", "react", "vue"];
const kinds: readonly SymbolVariantKind[] = ["outline", "fill", "duotone"];
const weights = [
  SymbolWeight.Ultralight,
  SymbolWeight.Thin,
  SymbolWeight.Light,
  SymbolWeight.Regular,
  SymbolWeight.Medium
] as const;

export default function IconLab() {
  const [framework, setFramework] = useState<Framework>("astro");
  const [kind, setKind] = useState<SymbolVariantKind>("outline");
  const [weight, setWeight] = useState<SymbolWeight>(SymbolWeight.Regular);
  const [primaryColor, setPrimaryColor] = useState("#161616");
  const [accentColor, setAccentColor] = useState("#ff5c35");

  return (
    <section className="lab">
      <div className="toolbar">
        <fieldset>
          <legend>Renderer</legend>
          <div className="segmented">
            {frameworks.map((item) => (
              <button
                aria-pressed={framework === item}
                key={item}
                onClick={() => setFramework(item)}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>
        </fieldset>
        <label>Style<select value={kind} onChange={(event) => setKind(event.target.value as SymbolVariantKind)}>{kinds.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Weight<select value={weight} onChange={(event) => setWeight(event.target.value as SymbolWeight)}>{weights.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Primary<input aria-label="Primary color" type="color" value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} /></label>
        <label>Accent<input aria-label="Accent color" type="color" value={accentColor} onChange={(event) => setAccentColor(event.target.value)} /></label>
      </div>

      <div className="status-line">
        <span><b>{catalog.length}</b> symbols</span>
        <span className={`runtime runtime-${framework}`}>{framework} renderer</span>
        <span>viewport lazy chunks</span>
      </div>

      {framework === "vue" ? (
        <div className="vue-ready">
          <span>VUE</span>
          <div><h2>Integration ready.</h2><p>`@astrojs/vue` 与 Vue runtime 已接入。Vue 图标包完成后，可直接将组件挂到此渲染位。</p></div>
        </div>
      ) : (
        <div className="gallery">
          {catalog.map((icon) => (
            <LazyIcon
              accentColor={accentColor}
              framework={framework}
              key={icon.name}
              kind={kind}
              load={icon.load}
              name={icon.name}
              primaryColor={primaryColor}
              weight={weight}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function LazyIcon(props: {
  accentColor: string;
  framework: Exclude<Framework, "vue">;
  kind: SymbolVariantKind;
  load: Loader;
  name: string;
  primaryColor: string;
  weight: SymbolWeight;
}) {
  const root = useRef<HTMLElement>(null);
  const [symbol, setSymbol] = useState<CompiledSymbol>();

  useEffect(() => {
    const element = root.current;
    if (element === null || symbol !== undefined) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      observer.disconnect();
      void props.load().then((module) => {
        const loaded = Object.values(module)[0];
        if (loaded !== undefined) startTransition(() => setSymbol(loaded));
      });
    }, { rootMargin: "320px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, [props.load, symbol]);

  return (
    <article className="icon-card" ref={root}>
      <div className="icon-stage">
        {symbol === undefined ? (
          <span aria-label={`正在加载 ${props.name}`} className="skeleton" role="status">
            <span className="skeleton-shape" />
            <span className="visually-hidden">正在加载图标</span>
          </span>
        ) : <Icon symbol={symbol} {...props} />}
      </div>
      <p>{props.name}</p><small>{props.framework}</small>
    </article>
  );
}

function Icon({ symbol, kind, weight, primaryColor, accentColor }: {
  symbol: CompiledSymbol; kind: SymbolVariantKind; weight: SymbolWeight;
  primaryColor: string; accentColor: string;
}) {
  const model = createSymbolRenderModel(symbol, {
    kind,
    weight,
    primaryColor,
    accentColor,
    accentOpacity: 0.55
  });
  const viewBox = `${model.viewBox.x} ${model.viewBox.y} ${model.viewBox.width} ${model.viewBox.height}`;
  return <svg aria-label={model.name} fill={model.fill} role="img" viewBox={viewBox}>{model.layers.map((layer) => <g fill={layer.fill} key={layer.role} opacity={layer.opacity}>{layer.paths.map((path, index) => <path d={path.d} fillRule={path.fillRule} key={index} />)}</g>)}</svg>;
}
