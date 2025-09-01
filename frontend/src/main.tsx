import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./modules/App";
// Import from barrel to avoid TS picking a removed shadow .ts file
import { PaletteProvider } from "./lib";
import "./global.css";

createRoot(document.getElementById("root")!).render(
    <PaletteProvider>
        <App />
    </PaletteProvider>
);
