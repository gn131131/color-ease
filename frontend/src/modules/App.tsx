import React from "react";
import { ImageWorkspace } from "../components/ImageWorkspace.tsx";

export const App: React.FC = () => {
    return (
        <div className="app-root">
            <header className="app-header">
                <h1>图像工具实验台</h1>
            </header>
            <ImageWorkspace />
        </div>
    );
};
