import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
export const ContrastChecker = () => {
    const [fg, setFg] = useState("#ffffff");
    const [bg, setBg] = useState("#000000");
    const [ratio, setRatio] = useState(null);
    useEffect(() => {
        fetch("/api/contrast", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fg, bg }) })
            .then((r) => r.json())
            .then(setRatio)
            .catch(() => { });
    }, [fg, bg]);
    return (_jsxs("div", { children: [_jsx("h3", { children: "Contrast" }), _jsxs("label", { children: ["FG ", _jsx("input", { type: "color", value: fg, onChange: (e) => setFg(e.target.value) })] }), _jsxs("label", { children: ["BG ", _jsx("input", { type: "color", value: bg, onChange: (e) => setBg(e.target.value) })] }), ratio && (_jsxs("p", { className: ratio.level.startsWith("A") ? "contrast-pass" : "contrast-fail", children: [ratio.ratio, ":1 ", ratio.level] })), _jsx("div", { style: { background: bg, color: fg, padding: "8px", borderRadius: 8, marginTop: 8 }, children: "Aa Text preview" })] }));
};
