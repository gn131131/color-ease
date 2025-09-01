import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
export const ColorPicker = ({ value, onChange }) => {
    const [manual, setManual] = useState(value);
    return (_jsxs("div", { children: [_jsx("h3", { children: "Color Picker" }), _jsx("input", { type: "color", value: value, onChange: (e) => onChange(e.target.value) }), _jsx("input", { value: manual, onChange: (e) => setManual(e.target.value), onBlur: () => manual && onChange(manual) })] }));
};
