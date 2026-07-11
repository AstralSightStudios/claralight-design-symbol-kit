import { Button, ButtonGroup, FormControl, FormLabel } from "@chakra-ui/react";
import { SymbolWeight } from "@claralight-design/symbol-kit-core";

const WEIGHT_LABELS: Readonly<Record<SymbolWeight, string>> = {
  [SymbolWeight.Ultralight]: "UltraLight",
  [SymbolWeight.Thin]: "Thin",
  [SymbolWeight.Light]: "Light",
  [SymbolWeight.Regular]: "Regular",
  [SymbolWeight.Medium]: "Medium",
  [SymbolWeight.Semibold]: "SemiBold",
  [SymbolWeight.Bold]: "Bold",
  [SymbolWeight.Heavy]: "Heavy",
  [SymbolWeight.Black]: "Black"
};

export interface WeightSelectorProps {
  readonly value: SymbolWeight;
  readonly weights: readonly SymbolWeight[];
  readonly onChange: (value: SymbolWeight) => void;
}

export function WeightSelector({ value, weights, onChange }: WeightSelectorProps) {
  return (
    <FormControl>
      <FormLabel>字重</FormLabel>
      <ButtonGroup flexWrap="wrap">
        {weights.map((weight) => (
          <Button
            colorScheme="blue"
            key={weight}
            onClick={() => {
              onChange(weight);
            }}
            variant={weight === value ? "solid" : "outline"}
          >
            {WEIGHT_LABELS[weight]}
          </Button>
        ))}
      </ButtonGroup>
    </FormControl>
  );
}
