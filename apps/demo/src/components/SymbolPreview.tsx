import { Box, Center, useColorModeValue } from "@chakra-ui/react";
import { renderSvg } from "@claralight-design/symbol-kit-compiler";
import type {
  SymbolIr,
  SymbolVariantKind,
  SymbolWeight
} from "@claralight-design/symbol-kit-core";
import { useMemo } from "react";

export interface SymbolPreviewProps {
  readonly symbol: SymbolIr;
  readonly kind: SymbolVariantKind;
  readonly weight: SymbolWeight;
  readonly primaryColor: string;
  readonly accentColor: string;
  readonly accentOpacity: number;
}

export function SymbolPreview({
  symbol,
  kind,
  weight,
  primaryColor,
  accentColor,
  accentOpacity
}: SymbolPreviewProps) {
  const background = useColorModeValue("gray.50", "gray.700");
  const svg = useMemo(
    () => renderSvg(symbol, { kind, weight, primaryColor, accentColor, accentOpacity }),
    [accentColor, accentOpacity, kind, primaryColor, symbol, weight]
  );

  return (
    <Center bg={background} minH="sm" p={8}>
      <Box
        aria-label={`${symbol.name} ${kind} ${weight}`}
        boxSize={{ base: "48", md: "64" }}
        dangerouslySetInnerHTML={{ __html: svg }}
        role="img"
        sx={{
          "& svg": {
            display: "block",
            height: "100%",
            width: "100%"
          }
        }}
      />
    </Center>
  );
}
