import React, { PropsWithChildren } from "react";

// Internal interfaces (not directly exported to avoid TS edge-case where 'locally declared' warning appears)
interface PaletteColorDef { hex: string; hsl: { h: number; s: number; l: number }; }
interface PaletteDataDef { scheme: string; colors: PaletteColorDef[]; }
interface StoreState { palette: PaletteDataDef | null; setPalette: (p: PaletteDataDef) => void; saved: PaletteDataDef[]; save: (p: PaletteDataDef) => void; }

// Public exported aliases (these ARE the types consumers import)
export type PaletteColor = PaletteColorDef;
export type PaletteData = PaletteDataDef;
export type GeneratedPalette = PaletteDataDef;

const Ctx = React.createContext<StoreState | null>(null);

export const PaletteProvider: React.FC<PropsWithChildren> = ({ children }) => {
    const [palette, setPalette] = React.useState<PaletteDataDef | null>(null);
    const [saved, setSaved] = React.useState<PaletteDataDef[]>(() => {
        try { return JSON.parse(localStorage.getItem("palettes") || "[]"); } catch { return []; }
    });

    const save = (p: PaletteDataDef) => {
        setSaved(s => { const next = [...s, p]; localStorage.setItem("palettes", JSON.stringify(next)); return next; });
    };

    return <Ctx.Provider value={{ palette, setPalette, saved, save }}>{children}</Ctx.Provider>;
};

export function usePaletteStore() {
    const ctx = React.useContext(Ctx);
    if (!ctx) throw new Error("PaletteProvider missing");
    return ctx;
}
