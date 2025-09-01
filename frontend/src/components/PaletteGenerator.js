import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { usePaletteStore } from "../lib/store";
export const PaletteGenerator = ({ palette }) => {
    const { palette: storePalette } = usePaletteStore();
    const current = palette || storePalette;
    if (!current) {
        return (_jsxs("div", { children: [_jsx("h3", { children: "Palette" }), _jsx("p", { children: "Generating..." })] }));
    }
    return (_jsxs("div", { children: [_jsx("h3", { children: current.scheme }), _jsx("div", { className: "palette-grid", children: current.colors.map((c, i) => (_jsx("div", { className: "color-swatch", style: { background: c.hex }, title: c.hex, children: _jsx("span", { children: c.hex }) }, i))) })] }));
};
