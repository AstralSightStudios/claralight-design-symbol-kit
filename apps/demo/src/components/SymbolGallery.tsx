import { Box, Button, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { renderSvg } from "@claralight-design/symbol-kit-compiler";
import type { SymbolIr, SymbolVariantKind } from "@claralight-design/symbol-kit-core";

export interface SymbolGalleryProps {
  readonly accentColor: string;
  readonly accentOpacity: number;
  readonly kind: SymbolVariantKind;
  readonly onSelect: (name: string) => void;
  readonly primaryColor: string;
  readonly selectedName: string;
  readonly symbols: readonly SymbolIr[];
}

export function SymbolGallery({
  accentColor,
  accentOpacity,
  kind,
  onSelect,
  primaryColor,
  selectedName,
  symbols
}: SymbolGalleryProps) {
  return (
    <SimpleGrid columns={{ base: 2, sm: 3, md: 5, lg: 7 }} spacing={4}>
      {symbols.map((symbol) => (
        <SymbolTile
          accentColor={accentColor}
          accentOpacity={accentOpacity}
          isSelected={symbol.name === selectedName}
          key={symbol.name}
          kind={kind}
          onSelect={onSelect}
          primaryColor={primaryColor}
          symbol={symbol}
        />
      ))}
    </SimpleGrid>
  );
}

interface SymbolTileProps {
  readonly accentColor: string;
  readonly accentOpacity: number;
  readonly isSelected: boolean;
  readonly kind: SymbolVariantKind;
  readonly onSelect: (name: string) => void;
  readonly primaryColor: string;
  readonly symbol: SymbolIr;
}

function SymbolTile({
  accentColor,
  accentOpacity,
  isSelected,
  kind,
  onSelect,
  primaryColor,
  symbol
}: SymbolTileProps) {
  const variant = symbol.variants.find((candidate) => candidate.kind === kind);
  if (variant === undefined) {
    return null;
  }

  const svg = renderSvg(symbol, {
    kind,
    weight: variant.weight,
    primaryColor,
    accentColor,
    accentOpacity
  });

  return (
    <Button
      aria-pressed={isSelected}
      h="auto"
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
}
