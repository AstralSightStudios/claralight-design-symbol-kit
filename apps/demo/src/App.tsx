import {
  Box,
  Container,
  Divider,
  FormControl,
  FormLabel,
  Grid,
  GridItem,
  Heading,
  HStack,
  Input,
  ListItem,
  Stack,
  Text,
  UnorderedList
} from "@chakra-ui/react";
import {
  SYMBOL_WEIGHT_ORDER,
  SymbolWeight,
  type SymbolVariantKind,
} from "@claralight-design/symbol-kit-core";
import { useEffect, useMemo, useState } from "react";

import { SymbolPreview } from "./components/SymbolPreview.js";
import { VariantSelector } from "./components/VariantSelector.js";
import { WeightSelector } from "./components/WeightSelector.js";
import { creditCardSymbol } from "./fixtures/credit-card.js";

const VARIANT_ORDER: readonly SymbolVariantKind[] = ["outline", "fill", "duotone"];

export function App() {
  const symbol = creditCardSymbol;
  const weights = useMemo(
    () =>
      SYMBOL_WEIGHT_ORDER.filter((weight) =>
        symbol.variants.some((variant) => variant.weight === weight)
      ),
    [symbol]
  );
  const [weight, setWeight] = useState<SymbolWeight>(weights[0] ?? SymbolWeight.Ultralight);
  const variants = useMemo(
    () =>
      VARIANT_ORDER.filter((kind) =>
        symbol.variants.some((variant) => variant.kind === kind && variant.weight === weight)
      ),
    [symbol, weight]
  );
  const [kind, setKind] = useState<SymbolVariantKind>(variants[0] ?? "outline");
  const [primaryColor, setPrimaryColor] = useState("#1972F8");
  const [accentColor, setAccentColor] = useState("#7C9ED9");

  useEffect(() => {
    if (!variants.includes(kind)) {
      setKind(variants[0] ?? "outline");
    }
  }, [kind, variants]);

  const selectedVariant = symbol.variants.find(
    (variant) => variant.kind === kind && variant.weight === weight
  );
  const layers = selectedVariant?.layers ?? [];
  const pathCount = layers.reduce((total, layer) => total + layer.geometry.paths.length, 0);
  const viewBox = [symbol.viewBox.x, symbol.viewBox.y, symbol.viewBox.width, symbol.viewBox.height].join(
    " "
  );

  return (
    <Container maxW="6xl" py={{ base: 8, md: 12 }}>
      <Stack spacing={8}>
        <Box>
          <Heading size="lg">ClaraLight SymbolKit</Heading>
          <Text mt={2}>真实 Figma SVG 经编译后生成 Symbol IR，并由 SVG Renderer 输出。</Text>
        </Box>

        <Grid gap={8} templateColumns={{ base: "1fr", lg: "minmax(0, 3fr) minmax(0, 2fr)" }}>
          <GridItem>
            <Box borderWidth="1px">
              <SymbolPreview
                accentColor={accentColor}
                kind={kind}
                primaryColor={primaryColor}
                symbol={symbol}
                weight={weight}
              />
            </Box>
          </GridItem>

          <GridItem>
            <Stack borderWidth="1px" divider={<Divider />} p={6} spacing={6}>
              <VariantSelector onChange={setKind} value={kind} variants={variants} />
              <WeightSelector onChange={setWeight} value={weight} weights={weights} />
              <HStack align="start" spacing={4}>
                <FormControl>
                  <FormLabel>主色</FormLabel>
                  <Input
                    aria-label="主色"
                    onChange={(event) => {
                      setPrimaryColor(event.target.value);
                    }}
                    type="color"
                    value={primaryColor}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>强调色</FormLabel>
                  <Input
                    aria-label="强调色"
                    onChange={(event) => {
                      setAccentColor(event.target.value);
                    }}
                    type="color"
                    value={accentColor}
                  />
                </FormControl>
              </HStack>
            </Stack>
          </GridItem>
        </Grid>

        <Box borderWidth="1px" p={6}>
          <Heading mb={4} size="md">
            Symbol IR
          </Heading>
          <Grid gap={6} templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }}>
            <Box>
              <Text color="gray.500" fontSize="sm">
                Symbol Name
              </Text>
              <Text>{symbol.name}</Text>
            </Box>
            <Box>
              <Text color="gray.500" fontSize="sm">
                ViewBox
              </Text>
              <Text>{viewBox}</Text>
            </Box>
            <Box>
              <Text color="gray.500" fontSize="sm">
                当前 Variant
              </Text>
              <Text>{kind}</Text>
            </Box>
            <Box>
              <Text color="gray.500" fontSize="sm">
                当前 Weight
              </Text>
              <Text>{weight}</Text>
            </Box>
            <Box>
              <Text color="gray.500" fontSize="sm">
                Layers
              </Text>
              <UnorderedList>
                {layers.map((layer) => (
                  <ListItem key={layer.role}>{layer.role}</ListItem>
                ))}
              </UnorderedList>
            </Box>
            <Box>
              <Text color="gray.500" fontSize="sm">
                Geometry
              </Text>
              <Text>{pathCount} paths</Text>
            </Box>
            <Box>
              <Text color="gray.500" fontSize="sm">
                Schema Version
              </Text>
              <Text>{symbol.schemaVersion}</Text>
            </Box>
          </Grid>
        </Box>
      </Stack>
    </Container>
  );
}
