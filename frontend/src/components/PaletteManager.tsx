import React from "react";
import { usePaletteStore, PaletteData, PaletteColor } from "../lib";

interface Props {
    palette: PaletteData | null;
}
export const PaletteManager: React.FC<Props> = ({ palette }) => {
    const { saved, save } = usePaletteStore();
    return (
        <div>
            <h3>Palettes</h3>
            <button className="copy" disabled={!palette} onClick={() => palette && save(palette)}>
                Save current
            </button>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                {saved.map((p: PaletteData, i: number) => (
                    <div key={i} style={{ border: "1px solid #333", padding: 4, borderRadius: 6, fontSize: 11 }}>
                        <strong>{p.scheme}</strong>
                        <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                            {p.colors.slice(0, 5).map((c: PaletteColor, j: number) => (
                                <div key={j} style={{ width: 18, height: 18, background: c.hex, borderRadius: 4 }} title={c.hex}></div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
