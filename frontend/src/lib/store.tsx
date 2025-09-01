import React, { PropsWithChildren } from "react";

export interface PaletteColor {
    hex: string;
    hsl: { h: number; s: number; l: number };
}
export interface PaletteData {
    scheme: string;
    colors: PaletteColor[];
}
export interface GeneratedPalette extends PaletteData {}

export type { PaletteColor as TPaletteColor, PaletteData as TPaletteData };
interface StoreState {
    palette: PaletteData | null;
    setPalette: (p: PaletteData) => void;
    saved: PaletteData[];
    save: (p: PaletteData) => void;
}

const Ctx = React.createContext<StoreState | null>(null);

export const PaletteProvider: React.FC<PropsWithChildren> = ({ children }) => {
    const [palette, setPalette] = React.useState<PaletteData | null>(null);
    const [saved, setSaved] = React.useState<PaletteData[]>(() => {
        try {
            return JSON.parse(localStorage.getItem("palettes") || "[]");
        } catch {
            return [];
        }
    });

    const save = (p: PaletteData) => {
        setSaved((s) => {
            const next = [...s, p];
            localStorage.setItem("palettes", JSON.stringify(next));
            return next;
        });
    };

    return <Ctx.Provider value={{ palette, setPalette, saved, save }}>{children}</Ctx.Provider>;
};

export function usePaletteStore() {
    const ctx = React.useContext(Ctx);
    if (!ctx) throw new Error("PaletteProvider missing");
    return ctx;
}
