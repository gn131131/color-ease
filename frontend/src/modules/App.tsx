import React from "react";
import { ImageWorkspace } from "../components/ImageWorkspace.tsx";

export const App: React.FC = () => {
    return (
        <div className="app-root">
            <header className="app-header">
                <h1>图像工具实验台</h1>
                <div className="hint">上传多张图片，滚轮缩放，拖拽移动，取色与测量。</div>
            </header>
            <ImageWorkspace />
            <footer className="app-footer">初始版本：上传 / 切换 / 缩放 / 像素网格 / 拖拽 / 取色 / 距离测量</footer>
        </div>
    );
};
