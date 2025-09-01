import { jsx as _jsx } from "react/jsx-runtime";
import { createRoot } from "react-dom/client";
import { App } from "./modules/App";
import { PaletteProvider } from "./lib/store";
import "./global.css";
createRoot(document.getElementById("root")).render(_jsx(PaletteProvider, { children: _jsx(App, {}) }));
