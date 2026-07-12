import { Box, Button, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { renderSvg } from "@claralight-design/symbol-kit-compiler";
import type { SymbolIr, SymbolVariantKind, SymbolWeight } from "@claralight-design/symbol-kit-core";
import {
  memo,
  startTransition,
  useEffect,
  useMemo,
  useState,
  type RefCallback
} from "react";

export interface SymbolGalleryProps {
  readonly accentColor: string;
  readonly accentOpacity: number;
  readonly kind: SymbolVariantKind;
  readonly onSelect: (name: string) => void;
  readonly primaryColor: string;
  readonly selectedName: string;
  readonly symbols: readonly SymbolIr[];
  readonly weight: SymbolWeight;
}

export function SymbolGallery({
  accentColor,
  accentOpacity,
  kind,
  onSelect,
  primaryColor,
  selectedName,
  symbols,
  weight
}: SymbolGalleryProps) {
  return (
    <SimpleGrid columns={{ base: 2, sm: 3, md: 5, lg: 7 }} spacing={4}>
      {symbols.map((symbol) => (
        <LazySymbolTile
          accentColor={accentColor}
          accentOpacity={accentOpacity}
          isSelected={symbol.name === selectedName}
          key={symbol.name}
          kind={kind}
          onSelect={onSelect}
          primaryColor={primaryColor}
          symbol={symbol}
          weight={weight}
        />
      ))}
    </SimpleGrid>
  );
}

const tileVisibilityCallbacks = new WeakMap<Element, (isVisible: boolean) => void>();
let tileVisibilityObserver: IntersectionObserver | undefined;

function getTileVisibilityObserver(): IntersectionObserver {
  tileVisibilityObserver ??= new IntersectionObserver(
    (entries) => {
      startTransition(() => {
        for (const entry of entries) {
          tileVisibilityCallbacks.get(entry.target)?.(entry.isIntersecting);
        }
      });
    },
    { rootMargin: "200px 0px" }
  );

  return tileVisibilityObserver;
}

const LazySymbolTile = memo(function LazySymbolTile(props: SymbolTileProps) {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (element === null) {
      return;
    }
    if (typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }

    const observer = getTileVisibilityObserver();
    tileVisibilityCallbacks.set(element, setIsVisible);
    observer.observe(element);

    return () => {
      observer.unobserve(element);
      tileVisibilityCallbacks.delete(element);
    };
  }, [element]);

  const ref: RefCallback<HTMLDivElement> = setElement;

  return (
    <Box h="28" minW={0} ref={ref} sx={{ contain: "layout paint style" }}>
      {isVisible ? <SymbolTile {...props} /> : <Box aria-hidden="true" h="full" />}
    </Box>
  );
});

interface SymbolTileProps {
  readonly accentColor: string;
  readonly accentOpacity: number;
  readonly isSelected: boolean;
  readonly kind: SymbolVariantKind;
  readonly onSelect: (name: string) => void;
  readonly primaryColor: string;
  readonly symbol: SymbolIr;
  readonly weight: SymbolWeight;
}

const SymbolTile = memo(function SymbolTile({
  accentColor,
  accentOpacity,
  isSelected,
  kind,
  onSelect,
  primaryColor,
  symbol,
  weight
}: SymbolTileProps) {
  const variant = symbol.variants.find(
    (candidate) => candidate.kind === kind && candidate.weight === weight
  );
  const svg = useMemo(
    () =>
      variant === undefined
        ? undefined
        : renderSvg(symbol, {
            kind,
            weight,
            primaryColor,
            accentColor,
            accentOpacity
          }),
    [accentColor, accentOpacity, kind, primaryColor, symbol, variant, weight]
  );
  if (svg === undefined) {
    return null;
  }

  return (
    <Button
      aria-pressed={isSelected}
      h="full"
      onClick={() => {
        onSelect(symbol.name);
      }}
      p={4}
      variant={isSelected ? "solid" : "outline"}
    >
      <Stack minW={0} spacing={3} w="full">
        <Box
          aria-hidden="true"
          boxSize={12}
          dangerouslySetInnerHTML={{ __html: svg }}
          mx="auto"
          sx={{
            "& svg": {
              display: "block",
              height: "100%",
              width: "100%"
            }
          }}
        />
        <Text fontSize="xs" noOfLines={1}>
          {symbol.name}
        </Text>
      </Stack>
    </Button>
  );
});
