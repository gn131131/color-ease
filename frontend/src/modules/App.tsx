import React, { useState, useEffect } from "react";
import { ColorPicker } from "../components/ColorPicker";
import { PaletteGenerator } from "../components/PaletteGenerator";
import { ContrastChecker } from "../components/ContrastChecker";
import { PreviewPanel } from "../components/PreviewPanel";
import { PaletteManager } from "../components/PaletteManager";
import { ColorConverter } from "../components/ColorConverter";
import { usePaletteStore } from "../lib/store";

export const App: React.FC = () => {
    const [base, setBase] = useState("#6750ff");
    const [scheme, setScheme] = useState("complementary");
    const { palette, setPalette } = usePaletteStore();

    useEffect(() => {
        fetch("/api/palette", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ base, scheme }) })
            .then((r) => r.json())
            .then((data) => setPalette(data))
            .catch(console.error);
    }, [base, scheme]);

    return (
        <div className="layout">
            <header>
                <h1>Color Ease</h1>
                <select value={scheme} onChange={(e) => setScheme(e.target.value)}>
                    {["complementary", "analogous", "triadic", "tetradic", "monochromatic"].map((s) => (
                        <option key={s}>{s}</option>
                    ))}
                </select>
            </header>
            <div className="panel">
                <ColorPicker value={base} onChange={setBase} />
            </div>
            <div className="panel">
                <ColorConverter color={base} />
            </div>
            <div className="panel">
                <PaletteGenerator palette={palette} />
            </div>
            <div className="panel">
                <ContrastChecker />
            </div>
            <div className="panel" style={{ gridColumn: "1/-1" }}>
                <PreviewPanel palette={palette} />
            </div>
            <div className="panel" style={{ gridColumn: "1/-1" }}>
                <PaletteManager palette={palette} />
            </div>
        </div>
    );
};
