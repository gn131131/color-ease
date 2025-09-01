import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { ColorPicker } from "../components/ColorPicker";
import { PaletteGenerator } from "../components/PaletteGenerator";
import { ContrastChecker } from "../components/ContrastChecker";
import { PreviewPanel } from "../components/PreviewPanel";
import { PaletteManager } from "../components/PaletteManager";
import { ColorConverter } from "../components/ColorConverter";
import { usePaletteStore } from "../lib/store";
export const App = () => {
    const [base, setBase] = useState("#6750ff");
    const [scheme, setScheme] = useState("complementary");
    const { palette, setPalette } = usePaletteStore();
    useEffect(() => {
        fetch("/api/palette", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ base, scheme }) })
            .then((r) => r.json())
            .then((data) => setPalette(data))
            .catch(console.error);
    }, [base, scheme]);
    return (_jsxs("div", { className: "layout", children: [_jsxs("header", { children: [_jsx("h1", { children: "Color Ease" }), _jsx("select", { value: scheme, onChange: (e) => setScheme(e.target.value), children: ["complementary", "analogous", "triadic", "tetradic", "monochromatic"].map((s) => (_jsx("option", { children: s }, s))) })] }), _jsx("div", { className: "panel", children: _jsx(ColorPicker, { value: base, onChange: setBase }) }), _jsx("div", { className: "panel", children: _jsx(ColorConverter, { color: base }) }), _jsx("div", { className: "panel", children: _jsx(PaletteGenerator, { palette: palette }) }), _jsx("div", { className: "panel", children: _jsx(ContrastChecker, {}) }), _jsx("div", { className: "panel", style: { gridColumn: "1/-1" }, children: _jsx(PreviewPanel, { palette: palette }) }), _jsx("div", { className: "panel", style: { gridColumn: "1/-1" }, children: _jsx(PaletteManager, { palette: palette }) })] }));
};
