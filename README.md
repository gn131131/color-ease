# Color Ease

一个前后端 Docker 化、通过 GitHub Action 自动构建推送镜像的调色助手示例项目。

## 功能概述
- 颜色拾取（输入 / color input）
- HEX / RGB / HSL 转换显示
- 多种调色板生成：互补、类似、三合（triadic）、四方（tetradic）、单色（monochromatic）
- 对比度检测（WCAG）
- 预览（按钮、卡片）+ 导出 CSS 变量（基础演示）
- 调色板本地保存管理（localStorage）

## 目录结构
```
backend/  Express + TypeScript API
frontend/ React + Vite + TypeScript UI
Dockerfile.backend / Dockerfile.frontend
.github/workflows/ci.yml  CI 构建并推送镜像
```

## 本地开发
### 后端
```bash
cd backend
npm install
npm run dev
```
服务默认端口 3001。

### 前端
```bash
cd frontend
npm install
npm run dev
```
浏览器访问 http://localhost:5173
Vite 已通过 `server.proxy` 把 /api 与 /health 代理到 3001。

## Docker 部署 (使用已构建镜像)
拉取并运行（默认 latest，可用 TAG 指定）:
```
docker login docker.pumpking.work
docker compose pull
TAG=latest docker compose up -d
```
访问: http://<服务器IP>:18080

自定义:
```
# 指定特定 tag (例如 CI 生成的 sha 或分支)
TAG=sha-xxxx docker compose up -d

# 改前端对外端口
FRONTEND_PORT=30080 docker compose up -d
```

## GitHub Action 镜像
推送到 main 触发构建：
- 后端: docker.pumpking.work/color-ease-backend:latest (及其他 tag)
- 前端: docker.pumpking.work/color-ease-frontend:latest

## TODO / 可扩展
- 图片取色、屏幕取色 (EyeDropper API)
- PNG / JSON / SCSS 导出
- 更丰富的预览组件
- 深浅主题切换
- 使用 chroma.js 以获得更精准色彩算法
```
