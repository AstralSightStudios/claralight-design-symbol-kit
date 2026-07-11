import { ChakraProvider, ColorModeScript } from "@chakra-ui/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App.js";
import { theme } from "./theme.js";

const root = document.querySelector<HTMLElement>("#root");

if (root === null) {
  throw new Error("Demo root element was not found.");
}

createRoot(root).render(
  <StrictMode>
    <ColorModeScript initialColorMode="system" />
    <ChakraProvider theme={theme}>
      <App />
    </ChakraProvider>
  </StrictMode>
);
