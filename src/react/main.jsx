import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";

function bootstrap() {
  const container = document.getElementById("root");
  if (!container) {
    // eslint-disable-next-line no-console
    console.error("React root element #root not found");
    return;
  }

  const root = createRoot(container);
  root.render(<App />);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}

