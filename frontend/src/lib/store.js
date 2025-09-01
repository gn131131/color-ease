import { jsx as _jsx } from "react/jsx-runtime";
import React from "react";
const Ctx = React.createContext(null);
export const PaletteProvider = ({ children }) => {
    const [palette, setPalette] = React.useState(null);
    const [saved, setSaved] = React.useState(() => {
        try {
            return JSON.parse(localStorage.getItem("palettes") || "[]");
        }
        catch {
            return [];
        }
    });
    const save = (p) => {
        setSaved((s) => {
            const next = [...s, p];
            localStorage.setItem("palettes", JSON.stringify(next));
            return next;
        });
    };
    return _jsx(Ctx.Provider, { value: { palette, setPalette, saved, save }, children: children });
};
export function usePaletteStore() {
    const ctx = React.useContext(Ctx);
    if (!ctx)
        throw new Error("PaletteProvider missing");
    return ctx;
}
