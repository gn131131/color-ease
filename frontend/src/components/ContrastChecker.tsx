import React, { useState, useEffect } from "react";

export const ContrastChecker: React.FC = () => {
    const [fg, setFg] = useState("#ffffff");
    const [bg, setBg] = useState("#000000");
    const [ratio, setRatio] = useState<{ ratio: number; level: string } | null>(null);

    useEffect(() => {
        fetch("/api/contrast", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fg, bg }) })
            .then((r) => r.json())
            .then(setRatio)
            .catch(() => {});
    }, [fg, bg]);

    return (
        <div>
            <h3>Contrast</h3>
            <label>
                FG <input type="color" value={fg} onChange={(e) => setFg(e.target.value)} />
            </label>
            <label>
                BG <input type="color" value={bg} onChange={(e) => setBg(e.target.value)} />
            </label>
            {ratio && (
                <p className={ratio.level.startsWith("A") ? "contrast-pass" : "contrast-fail"}>
                    {ratio.ratio}:1 {ratio.level}
                </p>
            )}
            <div style={{ background: bg, color: fg, padding: "8px", borderRadius: 8, marginTop: 8 }}>Aa Text preview</div>
        </div>
    );
};
