import React from "react";
import { usePaletteStore, PaletteData, PaletteColor } from "../lib/store";

interface Props {
    palette: PaletteData | null;
}
export const PaletteGenerator: React.FC<Props> = ({ palette }) => {
    const { palette: storePalette } = usePaletteStore();
    const current = palette || storePalette;
    if (!current) {
        return (
            <div>
                <h3>Palette</h3>
                <p>Generating...</p>
            </div>
        );
    }
    return (
        <div>
            <h3>{current.scheme}</h3>
            <div className="palette-grid">
                {current.colors.map((c: PaletteColor, i: number) => (
                    <div key={i} className="color-swatch" style={{ background: c.hex }} title={c.hex}>
                        <span>{c.hex}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
