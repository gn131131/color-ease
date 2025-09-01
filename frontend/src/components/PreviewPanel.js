import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export const PreviewPanel = ({ palette }) => {
    if (!palette) {
        return (_jsxs("div", { children: [_jsx("h3", { children: "Preview" }), _jsx("p", { children: "No palette yet" })] }));
    }
    const cssVars = palette.colors.map((c, i) => `--c${i}:${c.hex};`).join("\n");
    const cardStyle = { "--card-bg": palette.colors[0].hex, "--card-fg": "#fff" };
    return (_jsxs("div", { children: [_jsx("h3", { children: "Preview" }), _jsx("pre", { style: { fontSize: 11, background: "#161616", padding: 8, borderRadius: 6 }, children: `:root{\n${cssVars}}` }), _jsxs("div", { className: "preview-card", style: cardStyle, children: [_jsx("h4", { children: "Card Title" }), _jsx("p", { children: "Using first palette color as background." }), _jsx("div", { className: "preview-buttons", children: palette.colors.slice(0, 3).map((c, i) => (_jsx("button", { style: { background: c.hex, color: "#fff", border: "none", padding: "6px 10px", borderRadius: 6 }, children: c.hex }, i))) })] })] }));
};
