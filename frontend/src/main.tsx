import React from "react";
import { createRoot } from "react-dom/client";
// 显式引用 TSX 版本避免选择已删除的旧 JS 入口
import { App } from "./modules/App.tsx";
import "./global.css";

createRoot(document.getElementById("root")!).render(<App />);
