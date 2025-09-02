import React, { useState } from "react";
import { ImageWorkspace } from "../components/ImageWorkspace.tsx";

export const App: React.FC = () => {
    const [tool, setTool] = useState<"picker" | "measure">("picker");
    return (
        <div className="app-root">
            <header className="app-header">
                <h1>图像工具实验台</h1>
                <div className="header-actions">
                    <button className={tool === "measure" ? "on" : ""} onClick={() => setTool(tool === "measure" ? "picker" : "measure")}>
                        {tool === "measure" ? "退出测量" : "量长度"}
                    </button>
                </div>
            </header>
            <ImageWorkspace tool={tool} setTool={setTool} />
        </div>
    );
};
