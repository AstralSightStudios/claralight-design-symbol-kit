import { Button, ButtonGroup, FormControl, FormLabel } from "@chakra-ui/react";
import type { SymbolVariantKind } from "@claralight-design/symbol-kit-core";

const VARIANT_LABELS: Readonly<Record<SymbolVariantKind, string>> = {
  outline: "Outline",
  fill: "Fill",
  duotone: "Duotone"
};

export interface VariantSelectorProps {
  readonly value: SymbolVariantKind;
  readonly variants: readonly SymbolVariantKind[];
  readonly onChange: (value: SymbolVariantKind) => void;
}

export function VariantSelector({ value, variants, onChange }: VariantSelectorProps) {
  return (
    <FormControl>
      <FormLabel>样式</FormLabel>
      <ButtonGroup isAttached>
        {variants.map((variant) => (
          <Button
            colorScheme="blue"
            key={variant}
            onClick={() => {
              onChange(variant);
            }}
            variant={variant === value ? "solid" : "outline"}
          >
            {VARIANT_LABELS[variant]}
          </Button>
        ))}
      </ButtonGroup>
    </FormControl>
  );
}
