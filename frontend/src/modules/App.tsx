import React, { useState } from "react";
import { ImageWorkspace } from "../components/ImageWorkspace.tsx";
import { ToastProvider } from "../lib/toast";

export const App: React.FC = () => {
    const [tool, setTool] = useState<"picker" | "measure">("picker");
    const [color, setColor] = useState<string>("#000000");
    const [colorMode, setColorMode] = useState<"hex" | "rgb">("hex");

    const formatColor = (hex: string) => {
        if (!hex) return "";
        if (colorMode === "hex") return hex.toUpperCase();
        // hex -> rgb
        const h = hex.replace(/^#/, "");
        if (h.length !== 6) return hex;
        const r = parseInt(h.slice(0, 2), 16);
        const g = parseInt(h.slice(2, 4), 16);
        const b = parseInt(h.slice(4, 6), 16);
        return `rgb(${r}, ${g}, ${b})`;
    };

    return (
        <div className="app-root">
            <header className="app-header">
                <h1>图像工具实验台</h1>
                <div className="header-actions">
                    <button className={tool === "measure" ? "on" : ""} onClick={() => setTool(tool === "measure" ? "picker" : "measure")}>
                        {tool === "measure" ? "退出测量" : "量长度"}
                    </button>
                    <div className="btn-group" role="tablist" aria-label="色彩格式">
                        <button aria-pressed={colorMode === "hex"} className={colorMode === "hex" ? "on" : ""} onClick={() => setColorMode("hex")}>
                            HEX
                        </button>
                        <button aria-pressed={colorMode === "rgb"} className={colorMode === "rgb" ? "on" : ""} onClick={() => setColorMode("rgb")}>
                            RGB
                        </button>
                    </div>
                    {/* color shown in info-panel; no swatch in header */}
                </div>
            </header>
            <ToastProvider>
                <ImageWorkspace tool={tool} setTool={setTool} color={color} setColor={setColor} colorMode={colorMode} />
            </ToastProvider>
        </div>
    );
};
