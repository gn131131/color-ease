import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./modules/App";
import { PaletteProvider } from "./lib/store";
import "./global.css";

createRoot(document.getElementById("root")!).render(
    <PaletteProvider>
        <App />
    </PaletteProvider>
);
