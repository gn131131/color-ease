import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { hexToRgb, hexToHsl } from "../lib/convert";
export const ColorConverter = ({ color }) => {
    const rgb = hexToRgb(color);
    const hsl = hexToHsl(color);
    return (_jsxs("div", { children: [_jsx("h3", { children: "Format" }), _jsxs("p", { children: ["HEX: ", _jsx("code", { children: color })] }), _jsxs("p", { children: ["RGB:", " ", _jsxs("code", { children: [rgb.r, ", ", rgb.g, ", ", rgb.b] })] }), _jsxs("p", { children: ["HSL:", " ", _jsxs("code", { children: [hsl.h, " ", hsl.s, "% ", hsl.l, "%"] })] })] }));
};
