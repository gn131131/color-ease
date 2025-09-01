import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { usePaletteStore } from "../lib";
export const PaletteManager = ({ palette }) => {
    const { saved, save } = usePaletteStore();
    return (_jsxs("div", { children: [_jsx("h3", { children: "Palettes" }), _jsx("button", { className: "copy", disabled: !palette, onClick: () => palette && save(palette), children: "Save current" }), _jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }, children: saved.map((p, i) => (_jsxs("div", { style: { border: "1px solid #333", padding: 4, borderRadius: 6, fontSize: 11 }, children: [_jsx("strong", { children: p.scheme }), _jsx("div", { style: { display: "flex", gap: 4, marginTop: 4 }, children: p.colors.slice(0, 5).map((c, j) => (_jsx("div", { style: { width: 18, height: 18, background: c.hex, borderRadius: 4 }, title: c.hex }, j))) })] }, i))) })] }));
};
