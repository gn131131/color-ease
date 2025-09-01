import React from "react";
import { PaletteData, PaletteColor } from "../lib/store";

interface Props {
    palette: PaletteData | null;
}
export const PreviewPanel: React.FC<Props> = ({ palette }) => {
    if (!palette) {
        return (
            <div>
                <h3>Preview</h3>
                <p>No palette yet</p>
            </div>
        );
    }
    const cssVars = palette.colors.map((c: PaletteColor, i: number) => `--c${i}:${c.hex};`).join("\n");
    const cardStyle: React.CSSProperties & { [k: string]: string } = { "--card-bg": palette.colors[0].hex, "--card-fg": "#fff" } as any;
    return (
        <div>
            <h3>Preview</h3>
            <pre style={{ fontSize: 11, background: "#161616", padding: 8, borderRadius: 6 }}>{`:root{\n${cssVars}}`}</pre>
            <div className="preview-card" style={cardStyle}>
                <h4>Card Title</h4>
                <p>Using first palette color as background.</p>
                <div className="preview-buttons">
                    {palette.colors.slice(0, 3).map((c: PaletteColor, i: number) => (
                        <button key={i} style={{ background: c.hex, color: "#fff", border: "none", padding: "6px 10px", borderRadius: 6 }}>
                            {c.hex}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
