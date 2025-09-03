import React, { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "../lib/toast";

interface LoadedImage {
    id: string;
    name: string;
    url: string;
    img: HTMLImageElement;
    width: number;
    height: number;
}

type Tool = "picker" | "measure"; // 去掉 pan 按钮，使用 Space 拖拽

// 阈值：当缩放倍数超过该值时显示像素网格
const GRID_SHOW_SCALE = 8;

export const ImageWorkspace: React.FC<{ tool: Tool; setTool: (t: Tool) => void; color: string; setColor: (c: string) => void; colorMode: "hex" | "rgb" }> = ({
    tool,
    setTool,
    color,
    setColor,
    colorMode
}) => {
    const [images, setImages] = useState<LoadedImage[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [scale, setScale] = useState(1);
    const [minScale, setMinScale] = useState(1);
    const spacePressedRef = useRef(false);
    const tabPressedRef = useRef(false);
    const [, forceKeyState] = useState(0);
    // color is received from props
    const [measure, setMeasure] = useState<{ start: { x: number; y: number } | null; end: { x: number; y: number } | null; distance: number | null }>({ start: null, end: null, distance: null });
    const [status, setStatus] = useState<string>("");
    const [measureTip, setMeasureTip] = useState<{ visible: boolean; x: number; y: number; text: string }>({ visible: false, x: 0, y: 0, text: "" });
    const toast = useToast();

    const containerRef = useRef<HTMLDivElement | null>(null);
    const infoPanelRef = useRef<HTMLDivElement | null>(null);
    const selectionListRef = useRef<HTMLDivElement | null>(null);
    const [selectionHoverHex, setSelectionHoverHex] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const overlayRef = useRef<HTMLCanvasElement | null>(null);
    const offscreenRef = useRef<HTMLCanvasElement | null>(null);
    const viewState = useRef({ x: 0, y: 0, dragging: false, lastX: 0, lastY: 0 });
    const isInteractingRef = useRef(false);
    const interactionTimerRef = useRef<number | null>(null);
    const scaleRef = useRef(scale);
    const debugRef = useRef(true); // 打开调试日志
    const shiftPressedRef = useRef(false);
    const snappingRef = useRef<{ active: boolean; axis: "h" | "v" | null; x?: number; y?: number }>({ active: false, axis: null });
    const [infoPanelPosition, setInfoPanelPosition] = useState<"top" | "bottom">("top");
    const [isDragging, setIsDragging] = useState(false);
    const hoverPixelRef = useRef<{ x: number; y: number } | null>(null);
    // 新增：hover 信息框
    const [hoverInfo, setHoverInfo] = useState<{ visible: boolean; x: number; y: number; hex: string; rgb: string } | null>(null);
    const hoverBoxRef = useRef<HTMLDivElement | null>(null);
    // 框选相关
    const selectingRef = useRef(false);
    const possibleSelectionRef = useRef<{ x: number; y: number; clientX: number; clientY: number } | null>(null);
    const [selection, setSelection] = useState<{
        start: { x: number; y: number } | null;
        end: { x: number; y: number } | null;
        colors: Array<{ hex: string; count: number }>;
    }>({ start: null, end: null, colors: [] });
    const selectionRef = useRef(selection);
    // 缓存：选区内每种颜色对应的像素坐标列表（用于快速高亮）
    const selectionColorIndexRef = useRef<Map<string, Array<{ x: number; y: number }>> | null>(null);
    // 虚拟列表参数
    const ITEM_HEIGHT = 40; // 单个 color-item 的固定高度（px）
    const OVERSCAN = 6;
    const [listScrollTop, setListScrollTop] = useState(0);
    const [listClientHeight, setListClientHeight] = useState(0);

    const updateSelection = (v: typeof selection | ((s: typeof selection) => typeof selection)) => {
        setSelection((prev) => {
            let next = typeof v === "function" ? (v as any)(prev) : v;
            // normalize any provided colors to uppercase hex for reliable matching
            if (next && Array.isArray((next as any).colors)) {
                next = { ...next, colors: (next as any).colors.map((c: any) => ({ ...c, hex: String(c.hex).toUpperCase() })) };
            }
            selectionRef.current = next;
            // If selection cleared, drop cached index
            if (!next.start) {
                selectionColorIndexRef.current = null;
            }
            return next;
        });
    };

    const activeImage = images.find((i) => i.id === activeId) || null;

    // use the provided, richer SVG for the picker cursor (scaled down and encoded)
    const pickerSvg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1024 1024' width='28' height='28'>
<path d="M643.412923 182.807962l133.759582 133.780915L810.665733 349.868773a47.359852 47.359852 0 0 1-33.493228 80.853081 45.97319 45.97319 0 0 1-33.279896-13.866623l-33.706562-33.279896-133.759582-133.780916-33.279896-33.706561a47.466518 47.466518 0 0 1 33.493229-80.853081A48.319849 48.319849 0 0 1 610.133027 149.336067z" fill="#FFE45C"/>
<path d="M910.932087 49.069713A93.141042 93.141042 0 0 1 938.665333 115.821505a92.906376 92.906376 0 0 1-27.733246 66.986457l-133.759582 133.780915-133.759582-133.780915L777.172505 49.069713a94.634371 94.634371 0 0 1 133.759582 0z" fill="#FFB13B"/>
<path d="M375.680426 450.561792l200.746039-200.767373 133.759582 133.780916-66.986457 66.986457-21.546599 21.759932L618.666333 469.335067H362.667133l-2.773324-2.773325 15.786617-15.99995z" fill="#D9D9D9"/>
<path d="M170.667733 954.688217A45.674524 45.674524 0 0 1 128.0012 1002.666733a45.674524 45.674524 0 0 1-42.666533-47.99985C85.334667 928.234966 113.707911 874.667133 128.0012 874.667133s42.666533 53.567833 42.666533 80.021084zM621.652991 472.321724L375.893759 717.888957l-100.266354 33.279896-66.773124 66.986457A48.191849 48.191849 0 0 1 175.147719 832.0006a47.359852 47.359852 0 0 1-33.279896-80.853081l66.986458-66.773124 33.279896-100.266354 117.759632-117.546299 2.773324 2.773325h255.9992z" fill="#0091FF"/>
<path d="M749.119259 365.079392l-146.772875-146.794207L565.823832 181.335967a51.477172 51.477172 0 0 1-14.933287-38.229214A48.575848 48.575848 0 0 0 543.146569 149.336067a47.381185 47.381185 0 0 0 0 66.773124l33.279896 33.706562 133.759582 133.780915 33.706562 33.279896a45.97319 45.97319 0 0 0 33.279896 13.866623A46.805187 46.805187 0 0 0 810.665733 416.855231c0.383999-0.405332 0.661331-0.853331 1.023997-1.258663a49.962511 49.962511 0 0 1-25.59992-13.994623z" fill="#FFB13B"/>
<path d="M910.932087 76.141629l-73.429104 73.429104a85.333067 85.333067 0 0 1-120.68229 0l-20.074604-20.095938-53.333166 53.333167 133.759582 133.759582 133.759582-133.759582a94.357038 94.357038 0 0 0 11.199965-120.170291 91.327715 91.327715 0 0 1-11.199965 13.503958z" fill="#FF9500"/>
<path d="M128.0012 981.333467a44.159862 44.159862 0 0 1-41.493204-37.247884 56.234491 56.234491 0 0 0-1.173329 10.666633A45.674524 45.674524 0 0 0 128.0012 1002.666733a45.674524 45.674524 0 0 0 42.666533-47.99985 56.234491 56.234491 0 0 0-1.173329-10.666633A44.159862 44.159862 0 0 1 128.0012 981.333467z" fill="#095D96"/>
<path d="M490.666733 469.335067l60.181146-60.181146a42.666533 42.666533 0 0 0 0-60.351811L514.133327 312.087558l-138.452901 138.474234-15.786617 15.99995 2.773324 2.773325z" fill="#F0F0F0"/>
<path d="M362.667133 469.335067l-2.773324-2.773325-117.759632 117.546299-33.279896 100.266354-66.986458 66.794458a47.231852 47.231852 0 0 0 0 66.965124L490.666733 469.335067z" fill="#00A6FF"/>
<path d="M128.727957 949.33649a12.245295 8.810639 44.98 1 0 12.455776-12.464474 12.245295 8.810639 44.98 1 0-12.455776 12.464474Z" fill="#F6FAFD"/>
<path d="M128.0012 853.333867c-33.557228 0-63.9998 72.938439-63.9998 101.333016A66.901124 66.901124 0 0 0 128.0012 1024a66.901124 66.901124 0 0 0 63.9998-69.333117C192.001 926.272305 161.558428 853.333867 128.0012 853.333867z m0 127.9996a24.469257 24.469257 0 0 1-21.333267-26.666584 126.164939 126.164939 0 0 1 21.333267-52.949168 126.164939 126.164939 0 0 1 21.333267 52.949168A24.469257 24.469257 0 0 1 128.0012 981.333467zM959.9986 115.821505a115.882305 115.882305 0 0 0-197.844715-81.855744l-73.237105 73.237104 30.16524 30.165239 73.237104-73.237104a73.301104 73.301104 0 0 1 103.594343 0 73.322438 73.322438 0 0 1 0 103.573009l-118.676963 118.655629-103.615676-103.551676 18.389276-18.389276-30.165239-30.165239-18.389276 18.389276-18.282609-18.239943a70.207781 70.207781 0 0 0-97.17303 0 68.607786 68.607786 0 0 0 0 96.874364l18.453276 18.453276-319.359002 319.231002a21.333267 21.333267 0 0 0-5.183984 8.341307l-31.786567 95.573035-63.530469 63.317135a68.714452 68.714452 0 0 0 97.279696 97.04503l63.21047-63.423801 95.573034-31.786568a21.4826 21.4826 0 0 0 8.362641-5.141317l35.13589-35.13589-30.165239-30.165239-31.573235 31.551901-95.615701 31.807901a21.205267 21.205267 0 0 0-8.383974 5.16265l-66.559792 66.794458a27.306581 27.306581 0 0 1-36.927884 0.277333 26.389251 26.389251 0 0 1 0-36.885218l66.986457-66.751792a21.333267 21.333267 0 0 0 5.183984-8.383974l31.8079-95.594367L365.71779 490.668333h207.188686l-139.988896 139.988896 30.16524 30.165239L710.39938 413.591241l18.431942 18.431942a68.543786 68.543786 0 0 0 96.917031 0 68.799785 68.799785 0 0 0 0-97.151696l-18.303943-18.303943 118.570296-118.548963A114.431642 114.431642 0 0 0 959.9986 115.821505zM615.594343 448.0018h-207.210019l168.063475-168.063475 103.615676 103.594343z m179.946104-46.165189a25.877252 25.877252 0 0 1-36.671885 0l-200.703373-200.724706a26.111918 26.111918 0 0 1 18.538609-44.415861 26.197251 26.197251 0 0 1 18.303943 7.807975l33.365229 33.365229 133.780915 133.759582 33.343896 33.343896a25.791919 25.791919 0 0 1 0.042666 36.863885z" fill="#095D96"/>
</svg>`;
    // hotspot at left-bottom so the droplet tip aligns with pointer
    const pickerCursor = `url("data:image/svg+xml;utf8,${encodeURIComponent(pickerSvg)}") 0 28, crosshair`;

    // helpers: 计算当前画布/图片相关的对齐信息
    const computeImageMetrics = (scaleVal = scale) => {
        const canvas = canvasRef.current;
        if (!canvas || !activeImage) return null;
        const box = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const align = 1 / dpr;
        const imgW = activeImage.width * scaleVal;
        const imgH = activeImage.height * scaleVal;
        let cx = box.width / 2 - imgW / 2 + viewState.current.x;
        let cy = box.height / 2 - imgH / 2 + viewState.current.y;
        cx = Math.round(cx / align) * align;
        cy = Math.round(cy / align) * align;
        const imgWAligned = Math.max(1, Math.round(imgW / align) * align);
        const imgHAligned = Math.max(1, Math.round(imgH / align) * align);
        const pixelScale = imgWAligned / activeImage.width;
        return { box, dpr, align, imgW, imgH, cx, cy, imgWAligned, imgHAligned, pixelScale };
    };

    const alignToGrid = (v: number, align: number) => Math.round(v / align) * align;

    const computeMinScale = useCallback((imgW: number, imgH: number) => {
        const box = containerRef.current?.getBoundingClientRect();
        if (!box) return 1;
        // 最小缩放：短边必须填满容器对应边 => cover 模式 (max)
        return Math.max(box.width / imgW, box.height / imgH);
    }, []);

    // 加载文件
    const handleFiles = useCallback(
        (files: FileList | null) => {
            if (!files || files.length === 0) return;
            const list: Promise<LoadedImage>[] = Array.from(files).map(
                (f) =>
                    new Promise((resolve, reject) => {
                        const url = URL.createObjectURL(f);
                        const img = new Image();
                        img.onload = () => {
                            resolve({ id: crypto.randomUUID(), name: f.name, url, img, width: img.width, height: img.height });
                        };
                        img.onerror = reject;
                        img.src = url;
                    })
            );
            Promise.all(list)
                .then((res) => {
                    setImages((prev) => [...prev, ...res]);
                    if (!activeId && res.length > 0) {
                        setActiveId(res[0].id);
                    }
                })
                .catch((err) => {
                    console.error(err);
                });
        },
        [activeId]
    );

    // 拖拽上传
    useEffect(() => {
        const prevent = (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
        };
        const dropHandler = (e: DragEvent) => {
            prevent(e);
            handleFiles(e.dataTransfer?.files || null);
        };
        const node = containerRef.current;
        if (node) {
            node.addEventListener("dragover", prevent);
            node.addEventListener("drop", dropHandler);
        }
        return () => {
            if (node) {
                node.removeEventListener("dragover", prevent);
                node.removeEventListener("drop", dropHandler);
            }
        };
    }, [handleFiles]);

    // 当激活图片改变，重置视图
    useEffect(() => {
        if (!activeImage) return;
        const s = computeMinScale(activeImage.width, activeImage.height);
        setMinScale(s);
        setScale((cur) => (cur < s ? s : cur));
        viewState.current.x = 0;
        viewState.current.y = 0;
    }, [activeImage, computeMinScale]);

    // overlay 绘制：在 overlay canvas 上高亮选区内的匹配像素（使用缓存索引）
    const drawOverlay = useCallback(() => {
        const ov = overlayRef.current;
        if (!ov) return;
        const ctx = ov.getContext("2d");
        if (!ctx) return;
        const metrics = computeImageMetrics();
        if (!metrics) return;
        const { box, dpr, cx, cy, pixelScale } = metrics as any;
        // 清空 overlay（以设备像素为单位）
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, box.width, box.height);

        const sel = selectionRef.current;
        if (!sel.start || !sel.end) return;
        if (!selectionHoverHex) return;
        if (!activeImage) return;

        try {
            const hexFull = selectionHoverHex.toUpperCase();
            const index = selectionColorIndexRef.current;
            ctx.save();
            ctx.fillStyle = "rgba(255,255,0,0.24)";
            if (index && index.has(hexFull)) {
                const coords = index.get(hexFull)!;
                for (let i = 0; i < coords.length; i++) {
                    const p = coords[i];
                    const px = Math.round(cx + p.x * pixelScale);
                    const py = Math.round(cy + p.y * pixelScale);
                    ctx.fillRect(px, py, Math.ceil(pixelScale), Math.ceil(pixelScale));
                }
            } else {
                // fallback: 遍历像素数据
                const s = sel.start!;
                const e2 = sel.end!;
                const sx = Math.min(s.x, e2.x);
                const sy = Math.min(s.y, e2.y);
                const ex = Math.max(s.x, e2.x);
                const ey = Math.max(s.y, e2.y);
                const w = ex - sx + 1;
                const h = ey - sy + 1;
                if (w > 0 && h > 0) {
                    const off = offscreenRef.current!;
                    off.width = activeImage.width;
                    off.height = activeImage.height;
                    const octx = off.getContext("2d")!;
                    octx.drawImage(activeImage.img, 0, 0);
                    const imgData = octx.getImageData(sx, sy, w, h).data;
                    for (let yy = 0; yy < h; yy++) {
                        for (let xx = 0; xx < w; xx++) {
                            const idx = (yy * w + xx) * 4;
                            const a = imgData[idx + 3];
                            if (a === 0) continue;
                            const r = imgData[idx];
                            const g = imgData[idx + 1];
                            const b = imgData[idx + 2];
                            const hhex = ("#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")).toUpperCase();
                            if (hhex === hexFull) {
                                const px = Math.round(cx + (sx + xx) * pixelScale);
                                const py = Math.round(cy + (sy + yy) * pixelScale);
                                ctx.fillRect(px, py, Math.ceil(pixelScale), Math.ceil(pixelScale));
                            }
                        }
                    }
                }
            }
            ctx.restore();
        } catch (err) {
            console.error("overlay highlight failed", err);
        }
    }, [selectionHoverHex, activeImage]);

    // 绘制
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const off = offscreenRef.current;
        if (!canvas || !off) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        if (!activeImage) return;

        const metrics = computeImageMetrics(scaleRef.current);
        if (!metrics) return;
        const { box, dpr, align, cx, cy, imgWAligned, imgHAligned, pixelScale } = metrics;

        // 背景填充，避免短暂的空白闪烁
        const bg = containerRef.current ? getComputedStyle(containerRef.current).backgroundColor || "#0b1220" : "#0b1220";
        ctx.save();
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, box.width, box.height);
        ctx.restore();

        ctx.imageSmoothingEnabled = pixelScale < 4;
        ctx.drawImage(activeImage.img, cx, cy, imgWAligned, imgHAligned);
        if (debugRef.current) {
            console.debug("draw:", { scale, cx, cy, imgWAligned, imgHAligned, pixelScale, viewX: viewState.current.x, viewY: viewState.current.y });
        }

        // 测量线（使用对齐后的 pixelScale）
        if (measure.start && measure.end) {
            // 使用像素边缘进行绘制：像素索引 i 的左/上边缘位于 i * pixelScale
            const toScreen = (ix: number, iy: number) => ({ sx: cx + ix * pixelScale, sy: cy + iy * pixelScale });
            const s1 = toScreen(measure.start.x, measure.start.y);
            const s2 = toScreen(measure.end.x, measure.end.y);
            ctx.save();
            // 使用红色作为测量线颜色
            ctx.strokeStyle = "#ff4d4f";
            ctx.fillStyle = "#ff4d4f";
            ctx.lineWidth = Math.max(1 / dpr, 1);
            ctx.beginPath();
            ctx.moveTo(s1.sx, s1.sy);
            ctx.lineTo(s2.sx, s2.sy);
            ctx.stroke();
            // 距离展示已迁移为随鼠标浮动提示，不在画布上绘制文本
            ctx.restore();
        }

        // 高亮像素 hover 框：增强填充和边框，更明显
        if (pixelScale >= GRID_SHOW_SCALE && tool === "picker" && hoverPixelRef.current) {
            const p = hoverPixelRef.current;
            const toScreen = (ix: number, iy: number) => ({ sx: cx + ix * pixelScale, sy: cy + iy * pixelScale });
            const sp = toScreen(p.x, p.y);
            ctx.save();
            // 更明显的高亮：亮黄色半透明填充+加粗蓝色边框+阴影
            ctx.fillStyle = "rgba(255,255,0,0.25)";
            ctx.strokeStyle = "#00aaff";
            ctx.lineWidth = Math.max(2 / dpr, 2);
            ctx.shadowColor = "#00aaff";
            ctx.shadowBlur = 6;
            ctx.fillRect(sp.sx, sp.sy, pixelScale, pixelScale);
            ctx.strokeRect(sp.sx, sp.sy, pixelScale, pixelScale);
            ctx.restore();
        }

        // 吸附视觉提示：当用户按住 shift 并在测量中时，绘制锁定轴线（虚线）
        if (snappingRef.current.active && measure.start) {
            const start = measure.start;
            const axis = snappingRef.current.axis;
            ctx.save();
            // 吸附视觉提示使用与测量线相近的红色半透明色
            ctx.strokeStyle = "rgba(255,77,79,0.85)";
            ctx.setLineDash([6, 6]);
            ctx.lineWidth = Math.max(1 / dpr, 1);
            if (axis === "h") {
                // 使用像素边缘的 y（上边缘），即 start.y * pixelScale
                const y = cy + start.y * pixelScale;
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(box.width, y);
                ctx.stroke();
            } else if (axis === "v") {
                // 使用像素中心的 x
                // 使用像素边缘的 x（左边缘）
                const x = cx + start.x * pixelScale;
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, box.height);
                ctx.stroke();
            }
            ctx.restore();
        }

        // 像素网格：按 image 像素索引绘制，使用 pixelScale 映射到屏幕
        // 放大到阈值时显示网格（之前交互期间会暂时隐藏，现在恢复始终显示）
        if (pixelScale >= GRID_SHOW_SCALE) {
            const left = cx;
            const top = cy;
            const cols = activeImage.width;
            const rows = activeImage.height;
            ctx.save();
            ctx.strokeStyle = "rgba(255,255,255,0.12)";
            ctx.lineWidth = Math.max(1 / dpr, 0.5);
            for (let i = 0; i <= cols; i++) {
                const xRaw = left + i * pixelScale;
                const x = Math.round(xRaw / align) * align;
                if (x < -2 || x > box.width + 2) continue;
                ctx.beginPath();
                ctx.moveTo(x, top);
                ctx.lineTo(x, top + rows * pixelScale);
                ctx.stroke();
            }
            for (let j = 0; j <= rows; j++) {
                const yRaw = top + j * pixelScale;
                const y = Math.round(yRaw / align) * align;
                if (y < -2 || y > box.height + 2) continue;
                ctx.beginPath();
                ctx.moveTo(left, y);
                ctx.lineTo(left + cols * pixelScale, y);
                ctx.stroke();
            }
            ctx.restore();
        }

        // 绘制选区蒙版（高亮蒙版：遮罩全图，选区保留）
        const sel = selectionRef.current;
        if (sel.start && sel.end) {
            const s = sel.start;
            const e2 = sel.end;
            const sx = Math.min(s.x, e2.x);
            const sy = Math.min(s.y, e2.y);
            const ex = Math.max(s.x, e2.x);
            const ey = Math.max(s.y, e2.y);
            // 映射到屏幕
            const left = cx + sx * pixelScale;
            const top = cy + sy * pixelScale;
            const w = (ex - sx + 1) * pixelScale; // inclusive pixels
            const h = (ey - sy + 1) * pixelScale;
            ctx.save();
            // Use even-odd fill to draw a mask with a hole for the selection (more robust than composite ops)
            ctx.beginPath();
            ctx.rect(0, 0, box.width, box.height);
            ctx.rect(left, top, w, h);
            ctx.fillStyle = "rgba(0,0,0,0.45)";
            // 'evenodd' will fill the outer rect but leave the inner rect as a hole
            // @ts-ignore - some TS libs lack overload typing for fill("evenodd")
            ctx.fill("evenodd");
            // draw selection border
            ctx.strokeStyle = "rgba(0,180,255,0.95)";
            ctx.lineWidth = Math.max(2 / dpr, 1.5);
            ctx.strokeRect(left + 0.5 * ctx.lineWidth, top + 0.5 * ctx.lineWidth, Math.max(0, w - ctx.lineWidth), Math.max(0, h - ctx.lineWidth));
            ctx.restore();

            // 高亮已迁移到 overlay canvas（drawOverlay）以避免频繁重绘主画布。
        }
        // 尝试同步 overlay（如果存在）以保持高亮覆盖最新视图
        try {
            drawOverlay();
        } catch (err) {}
    }, [activeImage, scale, measure]);

    // 调整画布尺寸
    const resize = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const box = canvas.parentElement?.getBoundingClientRect();
        if (!box) return;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = box.width * dpr;
        canvas.height = box.height * dpr;
        canvas.style.width = box.width + "px";
        canvas.style.height = box.height + "px";
        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // 逻辑像素
        }
        // sync overlay size
        const ov = overlayRef.current;
        if (ov && box) {
            ov.width = box.width * dpr;
            ov.height = box.height * dpr;
            ov.style.width = box.width + "px";
            ov.style.height = box.height + "px";
            const octx = ov.getContext("2d");
            if (octx) octx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
        draw();
    }, [draw]);

    useEffect(() => {
        offscreenRef.current = document.createElement("canvas");
        resize();
        window.addEventListener("resize", resize);
        return () => {
            window.removeEventListener("resize", resize);
            if (interactionTimerRef.current) {
                window.clearTimeout(interactionTimerRef.current as any);
                interactionTimerRef.current = null;
            }
        };
    }, [resize]);

    // keep ref in sync to avoid stale closure in fast wheel events
    useEffect(() => {
        scaleRef.current = scale;
    }, [scale]);

    useEffect(() => {
        draw();
    }, [draw]);

    // 当 hover hex 或选区/图片变化时重绘 overlay
    useEffect(() => {
        try {
            drawOverlay();
        } catch (err) {}
    }, [drawOverlay, selectionHoverHex, selection.colors, activeImage]);

    // 动态计算选区颜色列表的最大高度，确保不超过预览面板可见高度（减去 info-panel 的上下间距）
    useEffect(() => {
        const updateMax = () => {
            const list = selectionListRef.current;
            const container = containerRef.current;
            if (!list || !container) return;
            const containerBox = container.getBoundingClientRect();
            const listBox = list.getBoundingClientRect();
            // 计算列表顶部距离容器顶部的距离，作为上下间距（使上下对称）
            const topGap = Math.max(8, Math.round(listBox.top - containerBox.top));
            // 可用高度 = 容器高度 - topGap - bottomGap(topGap) = container.height - 2*topGap
            const available = Math.max(80, Math.round(containerBox.height - 2 * topGap));
            list.style.maxHeight = available + "px";
            // 更新虚拟列表高度
            setListClientHeight(list.clientHeight);
        };

        // 使用 ResizeObserver 监听容器 / 面板 / 列表 的尺寸变化，配合 window resize 做快速响应
        const ro = new ResizeObserver(() => requestAnimationFrame(updateMax));
        if (containerRef.current) ro.observe(containerRef.current);
        if (infoPanelRef.current) ro.observe(infoPanelRef.current);
        if (selectionListRef.current) ro.observe(selectionListRef.current);

        const onWin = () => requestAnimationFrame(updateMax);
        window.addEventListener("resize", onWin);
        // initial
        requestAnimationFrame(updateMax);
        return () => {
            ro.disconnect();
            window.removeEventListener("resize", onWin);
        };
    }, [selection.colors, infoPanelPosition]);

    // 监听 selectionList 的滚动以更新 scrollTop 状态
    useEffect(() => {
        const list = selectionListRef.current;
        if (!list) return;
        const onScroll = () => setListScrollTop(list.scrollTop);
        list.addEventListener("scroll", onScroll);
        // initial
        setListScrollTop(list.scrollTop);
        setListClientHeight(list.clientHeight);
        return () => list.removeEventListener("scroll", onScroll);
    }, [selection.colors]);

    // 当 selectionHoverHex 变化时，尝试将对应列表项滚动到可见位置
    useEffect(() => {
        if (!selectionHoverHex) return;
        const list = selectionListRef.current;
        if (!list) return;
        // 找到索引并滚动到可见位置
        const idx = selection.colors.findIndex((c) => c.hex.toUpperCase() === selectionHoverHex.toUpperCase());
        if (idx >= 0) {
            const targetTop = idx * ITEM_HEIGHT;
            const targetBottom = targetTop + ITEM_HEIGHT;
            if (targetTop < list.scrollTop) {
                list.scrollTo({ top: targetTop, behavior: "smooth" });
            } else if (targetBottom > list.scrollTop + list.clientHeight) {
                list.scrollTo({ top: targetBottom - list.clientHeight, behavior: "smooth" });
            }
        }
    }, [selectionHoverHex]);

    // 当 hoverInfo 更新时，动态测量 hover box 的尺寸并夹取位置到可见区域（使用 layout effect 保证同步）
    React.useLayoutEffect(() => {
        if (!hoverInfo || !hoverInfo.visible) return;
        const box = hoverBoxRef.current;
        if (!box) return;
        const rect = box.getBoundingClientRect();
        const containerBox = containerRef.current?.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const margin = 8;
        // 目标位置来自 hoverInfo.x/y 已经包含 offset
        let left = hoverInfo.x;
        let top = hoverInfo.y;
        const maxRight = containerBox ? Math.min(vw, containerBox.right) - margin : vw - margin;
        const minLeft = containerBox ? Math.max(margin, containerBox.left) : margin;
        const maxBottom = containerBox ? Math.min(vh, containerBox.bottom) - margin : vh - margin;
        const minTop = containerBox ? Math.max(margin, containerBox.top) : margin;
        if (left + rect.width > maxRight) {
            left = Math.max(minLeft, hoverInfo.x - rect.width - 24);
        }
        if (top + rect.height > maxBottom) {
            top = Math.max(minTop, hoverInfo.y - rect.height - 24);
        }
        // apply to element (left/top are fixed coordinates)
        box.style.left = `${left}px`;
        box.style.top = `${top}px`;
    }, [hoverInfo]);

    // 当切换工具：如果离开量测工具，清空画板上的测量线与提示
    useEffect(() => {
        if (tool !== "measure") {
            // 如果存在测量数据，则清除并重绘
            setMeasure((m) => {
                if (m.start || m.end || m.distance) {
                    // hide tip as well
                    setMeasureTip({ visible: false, x: 0, y: 0, text: "" });
                    // ensure canvas updated (use setTimeout so state commits first)
                    hoverPixelRef.current = null;
                    setTimeout(() => draw(), 0);
                    return { start: null, end: null, distance: null };
                }
                return m;
            });
        }
    }, [tool, draw]);

    // 鼠标事件
    const formatColor = (hex: string) => {
        if (!hex) return "";
        if (colorMode === "hex") return hex.toUpperCase();
        const h = hex.replace(/^#/, "");
        if (h.length !== 6) return hex;
        const r = parseInt(h.slice(0, 2), 16);
        const g = parseInt(h.slice(2, 4), 16);
        const b = parseInt(h.slice(4, 6), 16);
        return `rgb(${r}, ${g}, ${b})`;
    };

    const toImageCoord = (clientX: number, clientY: number) => {
        const metrics = computeImageMetrics();
        if (!metrics || !activeImage) return null;
        const { box, cx, cy, pixelScale } = metrics;
        const x = (clientX - box.left - cx) / pixelScale;
        const y = (clientY - box.top - cy) / pixelScale;
        if (x < 0 || y < 0 || x >= activeImage.width || y >= activeImage.height) return null;
        return { x, y };
    };

    const clampView = useCallback(() => {
        const metrics = computeImageMetrics(scaleRef.current);
        if (!metrics) return;
        const { box, imgW, imgH } = metrics;
        // 不保留任何留白，始终贴合容器边缘
        const margin = 0;
        const { x, y } = viewState.current;
        let tlx = box.width / 2 - imgW / 2 + x;
        let tly = box.height / 2 - imgH / 2 + y;
        let nx = x;
        let ny = y;
        if (imgW >= box.width) {
            if (tlx > margin) nx -= tlx - margin;
            if (tlx + imgW < box.width - margin) nx += box.width - margin - (tlx + imgW);
        } else {
            const desired = box.width / 2 - imgW / 2;
            nx -= tlx - desired;
        }
        if (imgH >= box.height) {
            if (tly > margin) ny -= tly - margin;
            if (tly + imgH < box.height - margin) ny += box.height - margin - (tly + imgH);
        } else {
            const desiredY = box.height / 2 - imgH / 2;
            ny -= tly - desiredY;
        }
        if (nx !== x || ny !== y) {
            viewState.current.x = nx;
            viewState.current.y = ny;
        }
    }, [activeImage, scale]);

    // 计算在指定 scale 下，对 candidateX/candidateY 进行边界约束并返回新的坐标（不直接修改 viewState）
    const clampViewFor = (scaleVal: number, candidateX: number, candidateY: number) => {
        if (!activeImage) return { x: candidateX, y: candidateY };
        const canvas = canvasRef.current;
        if (!canvas) return { x: candidateX, y: candidateY };
        const box = canvas.getBoundingClientRect();
        // 不保留任何留白，始终贴合容器边缘
        const margin = 0;
        const imgW = activeImage.width * scaleVal;
        const imgH = activeImage.height * scaleVal;
        let tlx = box.width / 2 - imgW / 2 + candidateX;
        let tly = box.height / 2 - imgH / 2 + candidateY;
        let nx = candidateX;
        let ny = candidateY;
        if (imgW >= box.width) {
            if (tlx > margin) nx -= tlx - margin;
            if (tlx + imgW < box.width - margin) nx += box.width - margin - (tlx + imgW);
        } else {
            const desired = box.width / 2 - imgW / 2;
            nx -= tlx - desired;
        }
        if (imgH >= box.height) {
            if (tly > margin) ny -= tly - margin;
            if (tly + imgH < box.height - margin) ny += box.height - margin - (tly + imgH);
        } else {
            const desiredY = box.height / 2 - imgH / 2;
            ny -= tly - desiredY;
        }
        return { x: nx, y: ny };
    };

    const handleWheelNative = useCallback(
        (e: WheelEvent) => {
            if (!activeImage) return;
            // 如果滚轮事件来自 infoPanel，则让其自然滚动（不要 preventDefault），以便信息面板内部能滚动
            if (infoPanelRef.current && e.target instanceof Node && infoPanelRef.current.contains(e.target as Node)) {
                return;
            }
            e.preventDefault();
            // 标记为交互中，暂停网格绘制
            isInteractingRef.current = true;
            if (interactionTimerRef.current) {
                window.clearTimeout(interactionTimerRef.current as any);
                interactionTimerRef.current = null;
            }
            const delta = e.deltaY > 0 ? -1 : 1;
            const factor = 1 + delta * 0.15;
            // use ref for latest scale in case of rapid events
            const baseScale = scaleRef.current || scale;
            let newScale = baseScale * factor;
            if (newScale < minScale) newScale = minScale;
            if (newScale > 200) newScale = 200;
            const pos = toImageCoord(e.clientX, e.clientY);
            if (pos) {
                // 计算 clampedScale 后直接设置 viewState，使指针位置的图像像素映射到相同屏幕坐标
                // 如果滚轮事件来自 infoPanel，则忽略缩放
                if (infoPanelRef.current && e.target instanceof Node && infoPanelRef.current.contains(e.target as Node)) {
                    return;
                }
                const canvas = canvasRef.current!;
                const rect = canvas.getBoundingClientRect();
                const dpr = window.devicePixelRatio || 1;
                const align = 1 / dpr;

                // 计算对齐后的像素映射（用于精确放置）
                const imgW_after_raw = activeImage.width * newScale;
                const imgH_after_raw = activeImage.height * newScale;
                const imgW_after_aligned = Math.max(1, Math.round(imgW_after_raw / align) * align);
                const pixelScale_after = imgW_after_aligned / activeImage.width;

                // 目标使得： cx_after + pos.x * pixelScale_after === clientX - rect.left
                const cx_center_after = rect.width / 2 - imgW_after_raw / 2;
                const desiredViewX = e.clientX - rect.left - cx_center_after - pos.x * pixelScale_after;

                const cy_center_after = rect.height / 2 - imgH_after_raw / 2;
                const desiredViewY = e.clientY - rect.top - cy_center_after - pos.y * pixelScale_after;

                // 在写入 viewState 前对候选位置进行约束，避免后续 clamp 导致跳动
                const clamped = clampViewFor(newScale, desiredViewX, desiredViewY);
                // 对齐到 device-pixel 网格，避免最后一帧产生 1px 级别的抖动
                const alignedX = Math.round(clamped.x / align) * align;
                const alignedY = Math.round(clamped.y / align) * align;
                viewState.current.x = alignedX;
                viewState.current.y = alignedY;

                if (debugRef.current) {
                    console.debug("wheel: anchored", { pos, desiredViewX, desiredViewY, pixelScale_after, imgW_after_raw, imgW_after_aligned });
                }

                // 已使用锚点计算并设置 viewState（见上），无需额外的 raw 差值调整
            }
            // 立即更新 ref，避免快速事件里下一次读到陈旧值
            scaleRef.current = newScale;
            // use functional update to avoid races，并在更新后再次确保 view 在新 scale 下被约束
            setScale(() => newScale);
            // 使用 requestAnimationFrame 画面更新
            requestAnimationFrame(() => {
                // 已使用 clampViewFor，但也执行一次全量 clamp 以防其它逻辑修改
                clampView();
                draw();
            });
            // 交互结束后 120ms 恢复网格并重绘
            interactionTimerRef.current = window.setTimeout(() => {
                isInteractingRef.current = false;
                draw();
                interactionTimerRef.current = null;
            }, 120);
        },
        [activeImage, scale, minScale, clampView, draw]
    );

    useEffect(() => {
        const node = containerRef.current;
        if (!node) return;
        node.addEventListener("wheel", handleWheelNative, { passive: false });
        const keyDown = (ev: KeyboardEvent) => {
            // 如果按键事件的目标在信息面板内，则忽略全局快捷键以避免冲突
            if (infoPanelRef.current && ev.target instanceof Node && infoPanelRef.current.contains(ev.target as Node)) {
                return;
            }
            if (ev.code === "Space") {
                spacePressedRef.current = true;
                ev.preventDefault();
                forceKeyState((v) => v + 1);
            }
            if (ev.code === "Tab") {
                tabPressedRef.current = true;
                ev.preventDefault();
                forceKeyState((v) => v + 1);
            }
        };
        const keyUp = (ev: KeyboardEvent) => {
            if (ev.code === "Space") {
                spacePressedRef.current = false;
                forceKeyState((v) => v + 1);
            }
            if (ev.code === "Tab") {
                tabPressedRef.current = false;
                forceKeyState((v) => v + 1);
            }
        };
        window.addEventListener("keydown", keyDown, { passive: false });
        window.addEventListener("keyup", keyUp);
        return () => {
            node.removeEventListener("wheel", handleWheelNative as any);
            window.removeEventListener("keydown", keyDown as any);
            window.removeEventListener("keyup", keyUp as any);
        };
    }, [handleWheelNative]);

    const handlePointerDown: React.PointerEventHandler<HTMLCanvasElement> = (e) => {
        const canvas = canvasRef.current!;
        canvas.setPointerCapture(e.pointerId);
        // track shift
        shiftPressedRef.current = e.shiftKey;
        if (spacePressedRef.current) {
            viewState.current.dragging = true;
            setIsDragging(true);
            viewState.current.lastX = e.clientX;
            viewState.current.lastY = e.clientY;
        } else if (tool === "picker") {
            // record possible click/select start; actual action decided on pointerup or move
            const pos = toImageCoord(e.clientX, e.clientY);
            if (pos) {
                possibleSelectionRef.current = { x: Math.floor(pos.x), y: Math.floor(pos.y), clientX: e.clientX, clientY: e.clientY };
            }
        } else if (tool === "measure") {
            const pos = toImageCoord(e.clientX, e.clientY);
            if (pos) {
                // 使用所在像素索引（向下取整），确保点击落在的像素被选中
                setMeasure({ start: { x: Math.floor(pos.x), y: Math.floor(pos.y) }, end: null, distance: null });
                // reset snapping
                snappingRef.current = { active: !!e.shiftKey, axis: null };
                // 初始化 measureTip：隐藏直到移动产生距离
                setMeasureTip({ visible: false, x: e.clientX, y: e.clientY, text: "" });
            }
        }
        // don't immediately start selection here; use possibleSelectionRef and move threshold to decide
    };
    const handlePointerMove: React.PointerEventHandler<HTMLCanvasElement> = (e) => {
        // update shift state each move
        shiftPressedRef.current = e.shiftKey;
        // update hover pixel for picker
        if (tool === "picker") {
            const posHover = toImageCoord(e.clientX, e.clientY);
            if (posHover) {
                const hx = Math.floor(posHover.x);
                const hy = Math.floor(posHover.y);
                // only trigger draw if changed
                const prev = hoverPixelRef.current;
                if (!prev || prev.x !== hx || prev.y !== hy) {
                    hoverPixelRef.current = { x: hx, y: hy };
                    draw();
                }
                // 如果当前正在框选或已有固定选区，则不显示悬浮信息框（按要求2）
                if (!selectingRef.current && !(selectionRef.current && selectionRef.current.start)) {
                    // hover 信息框：采样颜色
                    const hex = sampleHexAt(hx, hy);
                    let rgb = "";
                    if (hex && hex.length === 7) {
                        const r = parseInt(hex.slice(1, 3), 16);
                        const g = parseInt(hex.slice(3, 5), 16);
                        const b = parseInt(hex.slice(5, 7), 16);
                        rgb = `rgb(${r}, ${g}, ${b})`;
                    }
                    // 将 hover 坐标限制在可见区域：相对于窗口或 container
                    const containerBox = containerRef.current?.getBoundingClientRect();
                    const vw = window.innerWidth;
                    const vh = window.innerHeight;
                    let hxClient = e.clientX + 16;
                    let hyClient = e.clientY + 16;
                    const boxW = 140; // 估算 hover 框宽度
                    const boxH = 64; // 估算 hover 框高度
                    const maxX = (containerBox ? Math.min(vw, containerBox.right) : vw) - 8;
                    const minX = containerBox ? Math.max(8, containerBox.left) : 8;
                    const maxY = (containerBox ? Math.min(vh, containerBox.bottom) : vh) - 8;
                    const minY = containerBox ? Math.max(8, containerBox.top) : 8;
                    if (hxClient + boxW > maxX) hxClient = Math.max(minX, e.clientX - boxW - 16);
                    if (hyClient + boxH > maxY) hyClient = Math.max(minY, e.clientY - boxH - 16);

                    setHoverInfo({
                        visible: true,
                        x: hxClient,
                        y: hyClient,
                        hex: hex || "",
                        rgb
                    });
                } else {
                    setHoverInfo(null);
                }
                // if there is a selection, and the hover pixel is inside it, sample and set selection hover hex
                const sel = selectionRef.current;
                if (sel.start && sel.end) {
                    const sx = Math.min(sel.start.x, sel.end.x);
                    const sy = Math.min(sel.start.y, sel.end.y);
                    const ex = Math.max(sel.start.x, sel.end.x);
                    const ey = Math.max(sel.start.y, sel.end.y);
                    if (hx >= sx && hx <= ex && hy >= sy && hy <= ey) {
                        const sample = sampleHexAt(hx, hy);
                        const sampleU = sample ? sample.toUpperCase() : null;
                        if (debugRef.current) {
                            console.debug("sample inside selection:", { hx, hy, sampleU, selectionColors: selectionRef.current?.colors?.map((c) => c.hex) });
                        }
                        setSelectionHoverHex(sampleU);
                        try {
                            requestAnimationFrame(() => drawOverlay());
                        } catch (err) {}
                    } else {
                        setSelectionHoverHex(null);
                        try {
                            requestAnimationFrame(() => drawOverlay());
                        } catch (err) {}
                    }
                } else {
                    setSelectionHoverHex(null);
                    try {
                        requestAnimationFrame(() => drawOverlay());
                    } catch (err) {}
                }
            } else {
                if (hoverPixelRef.current) {
                    hoverPixelRef.current = null;
                    draw();
                }
                setHoverInfo(null);
            }
        }
        if (viewState.current.dragging) {
            const dx = e.clientX - viewState.current.lastX;
            const dy = e.clientY - viewState.current.lastY;
            viewState.current.lastX = e.clientX;
            viewState.current.lastY = e.clientY;
            viewState.current.x += dx;
            viewState.current.y += dy;
            // 对齐 viewState 到 device pixel 网格，避免拖动后出现子像素累积
            const metrics = computeImageMetrics();
            if (metrics) {
                const { align } = metrics;
                viewState.current.x = Math.round(viewState.current.x / align) * align;
                viewState.current.y = Math.round(viewState.current.y / align) * align;
            }
            clampView();
            draw();
        } else if (tool === "picker") {
            const pos = toImageCoord(e.clientX, e.clientY);
            if (pos) {
                setStatus(`位置: ${Math.floor(pos.x)},${Math.floor(pos.y)}`);
                // 更新框选区域（如果正在框选）
                if (selectingRef.current && selectionRef.current.start) {
                    const p = { x: Math.floor(pos.x), y: Math.floor(pos.y) };
                    updateSelection((s) => ({ ...s, end: p }));
                    draw();
                } else if (possibleSelectionRef.current) {
                    // decide whether to start selection: use client delta threshold to avoid accidental tiny moves
                    const dx = e.clientX - possibleSelectionRef.current.clientX;
                    const dy = e.clientY - possibleSelectionRef.current.clientY;
                    const dist2 = dx * dx + dy * dy;
                    if (dist2 > 16) {
                        // if modifier key pressed or allow drag to select regardless? Start selection if modifier present or always start on drag
                        if (e.shiftKey || e.ctrlKey || e.altKey || true) {
                            selectingRef.current = true;
                            const start = { x: possibleSelectionRef.current.x, y: possibleSelectionRef.current.y };
                            updateSelection({ start, end: start, colors: [] });
                            draw();
                        }
                        possibleSelectionRef.current = null;
                    }
                }
            }
        } else if (tool === "measure") {
            if (measure.start) {
                const pos = toImageCoord(e.clientX, e.clientY);
                if (pos) {
                    // 使用所在像素索引（向下取整），确保鼠标落在的像素被选中
                    let ex = Math.floor(pos.x);
                    let ey = Math.floor(pos.y);
                    // 支持按住 Shift 时水平/垂直吸附
                    if (e.shiftKey) {
                        const dx = ex - measure.start.x;
                        const dy = ey - measure.start.y;
                        if (Math.abs(dx) >= Math.abs(dy)) {
                            // 水平吸附，锁定 y
                            ey = measure.start.y;
                            snappingRef.current = { active: true, axis: "h" };
                        } else {
                            // 垂直吸附，锁定 x
                            ex = measure.start.x;
                            snappingRef.current = { active: true, axis: "v" };
                        }
                    } else {
                        snappingRef.current = { active: false, axis: null };
                    }
                    const end = { x: ex, y: ey };
                    const dx2 = end.x - measure.start.x;
                    const dy2 = end.y - measure.start.y;
                    // 距离以像素中心为单位，索引差即为中心距离
                    const dist = Math.sqrt(dx2 * dx2 + dy2 * dy2);
                    setMeasure((m) => ({ ...m, end, distance: dist }));
                    // 更新随鼠标浮动的测量提示（client 坐标），显示为像素长度
                    setMeasureTip({ visible: true, x: e.clientX, y: e.clientY, text: `${dist.toFixed(1)} px` });
                    draw();
                }
            }
        }
    };
    const handlePointerUp: React.PointerEventHandler<HTMLCanvasElement> = (e) => {
        if (viewState.current.dragging) {
            viewState.current.dragging = false;
            setIsDragging(false);
            clampView();
            draw();
        }
        // clear hover when releasing pointer in picker
        if (tool === "picker" && hoverPixelRef.current) {
            hoverPixelRef.current = null;
            draw();
        }
        // clear shift/snapping when pointer released
        shiftPressedRef.current = false;
        snappingRef.current = { active: false, axis: null };
        // 如果存在 possibleSelectionRef 且未发生拖拽（selectingRef 未被触发），视为单击：仅在左键（button === 0）时取色并复制
        if (!selectingRef.current && possibleSelectionRef.current && tool === "picker") {
            const p = possibleSelectionRef.current;
            // clear possibleSelectionRef regardless of button to avoid stale state
            possibleSelectionRef.current = null;
            // only handle left-button clicks for copying (prevent right-click from copying)
            // PointerEvent.button: 0 = primary/left, 1 = middle, 2 = secondary/right
            // @ts-ignore - React's PointerEvent typing includes button, but keep safe
            if ((e as any).button !== 0) {
                // do not copy on non-left buttons
            } else {
                const hex = pickColorAt(p.x, p.y);
                if (hex) {
                    const text = formatColor(hex);
                    try {
                        navigator.clipboard
                            .writeText(text)
                            .then(() => {
                                toast.show("已复制");
                            })
                            .catch(() => {
                                toast.show("复制失败");
                            });
                    } catch (err) {
                        toast.show("复制失败");
                    }
                }
            }
        }

        // 结束框选：如果正在框选，将选区固定并统计颜色
        if (selectingRef.current && selectionRef.current.start) {
            selectingRef.current = false;
            // ensure selection.end exists
            const end = selectionRef.current.end || selectionRef.current.start;
            updateSelection((s) => ({ ...s, end }));
            // 统计颜色并更新信息面板
            setTimeout(() => {
                if (activeImage && selectionRef.current.start) {
                    const stats = pickColorsInSelection(selectionRef.current.start!, end!);
                    updateSelection((s) => ({ ...s, colors: stats }));
                    // 构建颜色到坐标索引以便后续高亮使用
                    buildColorIndexInSelection(selectionRef.current.start!, end!);
                    draw();
                }
            }, 0);
        }
        // 隐藏测量浮动提示（测量结束或取消）
        setMeasureTip((t) => ({ ...t, visible: false }));
        // clear selection hover highlight
        setSelectionHoverHex(null);
    };

    const handleContextMenu: React.MouseEventHandler<HTMLCanvasElement> = (e) => {
        // If currently in measure tool, use right-click to exit measure and suppress system menu
        if (tool === "measure") {
            e.preventDefault();
            e.stopPropagation();
            // clear measure state immediately and hide tip
            setMeasure({ start: null, end: null, distance: null });
            setMeasureTip({ visible: false, x: 0, y: 0, text: "" });
            // switch back to picker (or default tool)
            setTool("picker");
            // ensure canvas updated
            setTimeout(() => draw(), 0);
        }
        // Right-click in picker: cancel selection
        if (tool === "picker") {
            e.preventDefault();
            e.stopPropagation();
            selectingRef.current = false;
            possibleSelectionRef.current = null;
            updateSelection({ start: null, end: null, colors: [] });
            setTimeout(() => draw(), 0);
        }
    };

    const pickColorAt = (ix: number, iy: number) => {
        if (!activeImage) return;
        // 利用隐藏canvas
        const off = offscreenRef.current!;
        off.width = activeImage.width;
        off.height = activeImage.height;
        const octx = off.getContext("2d")!;
        octx.drawImage(activeImage.img, 0, 0);
        const data = octx.getImageData(Math.floor(ix), Math.floor(iy), 1, 1).data;
        const hex = "#" + [data[0], data[1], data[2]].map((v) => v.toString(16).padStart(2, "0")).join("");
        const hexU = hex.toUpperCase();
        setColor(hexU);
        return hexU;
    };

    // 仅采样颜色，不改变全局 color
    const sampleHexAt = (ix: number, iy: number) => {
        if (!activeImage) return null;
        const off = offscreenRef.current!;
        off.width = activeImage.width;
        off.height = activeImage.height;
        const octx = off.getContext("2d")!;
        octx.drawImage(activeImage.img, 0, 0);
        const data = octx.getImageData(Math.floor(ix), Math.floor(iy), 1, 1).data;
        const a = data[3];
        if (a === 0) return null;
        const hex = "#" + [data[0], data[1], data[2]].map((v) => v.toString(16).padStart(2, "0")).join("");
        return hex.toUpperCase();
    };

    // 统计选区内不重复颜色（排除 alpha === 0），返回按 count 降序的数组
    const pickColorsInSelection = (start: { x: number; y: number }, end: { x: number; y: number }) => {
        if (!activeImage) return [] as Array<{ hex: string; count: number }>;
        const sx = Math.max(0, Math.min(start.x, end.x));
        const sy = Math.max(0, Math.min(start.y, end.y));
        const ex = Math.min(activeImage.width - 1, Math.max(start.x, end.x));
        const ey = Math.min(activeImage.height - 1, Math.max(start.y, end.y));
        const w = ex - sx + 1;
        const h = ey - sy + 1;
        if (w <= 0 || h <= 0) return [];
        const off = offscreenRef.current!;
        off.width = activeImage.width;
        off.height = activeImage.height;
        const octx = off.getContext("2d")!;
        octx.drawImage(activeImage.img, 0, 0);
        const imgData = octx.getImageData(sx, sy, w, h).data;
        const map = new Map<string, number>();
        for (let i = 0; i < imgData.length; i += 4) {
            const a = imgData[i + 3];
            if (a === 0) continue; // skip fully transparent
            const r = imgData[i];
            const g = imgData[i + 1];
            const b = imgData[i + 2];
            const hex =
                "#" +
                [r, g, b]
                    .map((v) => v.toString(16).padStart(2, "0"))
                    .join("")
                    .toUpperCase();
            map.set(hex, (map.get(hex) || 0) + 1);
        }
        const arr = Array.from(map.entries()).map(([hex, count]) => ({ hex, count }));
        arr.sort((a, b) => b.count - a.count);
        return arr;
    };

    // 构建选区内颜色到坐标列表的索引，用于快速高亮（在选区固定后构建一次）
    const buildColorIndexInSelection = (start: { x: number; y: number }, end: { x: number; y: number }) => {
        if (!activeImage) return;
        const sx = Math.max(0, Math.min(start.x, end.x));
        const sy = Math.max(0, Math.min(start.y, end.y));
        const ex = Math.min(activeImage.width - 1, Math.max(start.x, end.x));
        const ey = Math.min(activeImage.height - 1, Math.max(start.y, end.y));
        const w = ex - sx + 1;
        const h = ey - sy + 1;
        if (w <= 0 || h <= 0) {
            selectionColorIndexRef.current = null;
            return;
        }
        const off = offscreenRef.current!;
        off.width = activeImage.width;
        off.height = activeImage.height;
        const octx = off.getContext("2d")!;
        octx.drawImage(activeImage.img, 0, 0);
        const imgData = octx.getImageData(sx, sy, w, h).data;
        const map = new Map<string, Array<{ x: number; y: number }>>();
        for (let yy = 0; yy < h; yy++) {
            for (let xx = 0; xx < w; xx++) {
                const idx = (yy * w + xx) * 4;
                const a = imgData[idx + 3];
                if (a === 0) continue;
                const r = imgData[idx];
                const g = imgData[idx + 1];
                const b = imgData[idx + 2];
                const hex = ("#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")).toUpperCase();
                if (!map.has(hex)) map.set(hex, []);
                map.get(hex)!.push({ x: sx + xx, y: sy + yy });
            }
        }
        selectionColorIndexRef.current = map;
    };

    const handleFileInput: React.ChangeEventHandler<HTMLInputElement> = (e) => {
        handleFiles(e.target.files);
        e.target.value = "";
    };

    const removeImage = (id: string) => {
        setImages((prev) => {
            const next = prev.filter((p) => p.id !== id);
            return next;
        });
        if (activeId === id) {
            setActiveId((cur) => {
                const remaining = images.filter((i) => i.id !== id);
                return remaining.length > 0 ? remaining[0].id : null;
            });
        }
    };

    // resetView 功能已移除（UI 中不再展示重置视图按钮）

    return (
        <div className="workspace-wrapper">
            <div className="left-bar">
                <div className="thumb-plus">
                    <label className="thumb-upload">
                        <div className="plus">+</div>
                        <input type="file" multiple accept="image/*" onChange={handleFileInput} />
                    </label>
                </div>
                <div className="thumb-list">
                    {images.map((img) => (
                        <div key={img.id} className={`thumb-wrapper ${img.id === activeId ? "active" : "inactive"}`}>
                            <button className={`thumb-item ${img.id === activeId ? "active" : ""}`} onClick={() => setActiveId(img.id)} title={`${img.name} ${img.width}×${img.height}`}>
                                <img src={img.url} alt={img.name} />
                            </button>
                            <button
                                className="thumb-del"
                                onClick={(ev) => {
                                    ev.stopPropagation();
                                    removeImage(img.id);
                                }}
                                aria-label="删除图片"
                                title="删除"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            </div>
            <div className="canvas-area" ref={containerRef}>
                <canvas
                    ref={canvasRef}
                    style={{ cursor: spacePressedRef.current ? (isDragging ? "grabbing" : "grab") : tool === "picker" ? pickerCursor : tool === "measure" ? "crosshair" : "default" }}
                    className={
                        spacePressedRef.current
                            ? `cursor-pan ${isDragging ? "grabbing" : ""}`
                            : tool === "measure"
                            ? "cursor-measure"
                            : tool === "picker"
                            ? "cursor-picker"
                            : tabPressedRef.current
                            ? "cursor-zoom"
                            : "cursor-cross"
                    }
                    onPointerDown={handlePointerDown}
                    onPointerMove={(e) => {
                        // when in picker mode, pick on move
                        if (tool === "picker") {
                            const pos = toImageCoord(e.clientX, e.clientY);
                            if (pos) pickColorAt(pos.x, pos.y);
                        }
                        handlePointerMove(e);
                    }}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={() => {
                        if (hoverPixelRef.current) {
                            hoverPixelRef.current = null;
                            draw();
                        }
                        setHoverInfo(null);
                        setSelectionHoverHex(null);
                        try {
                            requestAnimationFrame(() => drawOverlay());
                        } catch (err) {}
                    }}
                    onContextMenu={handleContextMenu}
                />

                {/* overlay canvas：用于绘制高亮，不影响主画布 */}
                <canvas ref={overlayRef} className="canvas-overlay" style={{ pointerEvents: "none", position: "absolute", left: 0, top: 0 }} />

                <div
                    ref={infoPanelRef}
                    // 当有固定选区时强制使用 top 类，避免 .bottom 的 bottom:16px 与 inline top 同时生效
                    className={`info-panel ${selectionRef.current && selectionRef.current.start ? "top" : infoPanelPosition}`}
                    // 当存在固定选区时，强制固定到右上角并禁止切换位置
                    style={selectionRef.current && selectionRef.current.start ? { position: "absolute", right: 12, top: 12, minHeight: 80 } : undefined}
                    onMouseEnter={() => {
                        if (!selectionRef.current || !selectionRef.current.start) {
                            setInfoPanelPosition((p) => (p === "top" ? "bottom" : "top"));
                        }
                    }}
                    onClick={() => {
                        if (selectionRef.current && selectionRef.current.start) return;
                        setInfoPanelPosition((p) => (p === "top" ? "bottom" : "top"));
                    }}
                >
                    <div className="info-content">
                        {/* 单色取色信息已移除：信息面板专注于选区统计与测距提示 */}
                        {/* 测距的数值改为随鼠标浮动提示，不在信息面板展示 */}
                        <div className="info-line small measure-hint">{status}</div>
                        {/* 框选颜色统计 */}
                        {selection.colors && selection.colors.length > 0 && (
                            <div className="info-line small selection-colors">
                                <div style={{ fontSize: 12, marginBottom: 6 }}>选区颜色（按像素数）:</div>
                                <div
                                    ref={selectionListRef}
                                    className="selection-colors-list color-list"
                                    role="list"
                                    aria-label="选区颜色"
                                    style={{ paddingRight: 6, position: "relative", overflowY: "auto" }}
                                >
                                    {/* spacer 用于设置滚动高度 */}
                                    <div style={{ height: selection.colors.length * ITEM_HEIGHT }} />
                                    {/* 计算可见项索引 */}
                                    {(() => {
                                        const total = selection.colors.length;
                                        const startIndex = Math.max(0, Math.floor(listScrollTop / ITEM_HEIGHT) - OVERSCAN);
                                        const endIndex = Math.min(total - 1, Math.ceil((listScrollTop + listClientHeight) / ITEM_HEIGHT) + OVERSCAN);
                                        const items = [] as JSX.Element[];
                                        for (let i = startIndex; i <= endIndex; i++) {
                                            const c = selection.colors[i];
                                            const isHighlighted = selectionHoverHex && selectionHoverHex === c.hex.toUpperCase();
                                            items.push(
                                                <div
                                                    key={c.hex + "_" + i}
                                                    role="listitem"
                                                    tabIndex={0}
                                                    data-hex={c.hex}
                                                    className={`color-item ${isHighlighted ? "highlighted" : ""}`}
                                                    onMouseEnter={() => {
                                                        setSelectionHoverHex(c.hex.toUpperCase());
                                                        try {
                                                            requestAnimationFrame(() => drawOverlay());
                                                        } catch (err) {}
                                                    }}
                                                    onMouseLeave={() => {
                                                        setSelectionHoverHex(null);
                                                        try {
                                                            requestAnimationFrame(() => drawOverlay());
                                                        } catch (err) {}
                                                    }}
                                                    onClick={() => {
                                                        try {
                                                            const txt = formatColor(c.hex);
                                                            navigator.clipboard.writeText(txt).then(() => toast.show("已复制"));
                                                        } catch (err) {
                                                            toast.show("复制失败");
                                                        }
                                                    }}
                                                    onKeyDown={(ev) => {
                                                        if (ev.key === "Enter" || ev.key === " ") {
                                                            try {
                                                                const txt = formatColor(c.hex);
                                                                navigator.clipboard.writeText(txt).then(() => toast.show("已复制"));
                                                            } catch (err) {
                                                                toast.show("复制失败");
                                                            }
                                                        }
                                                    }}
                                                    style={{ position: "absolute", top: i * ITEM_HEIGHT, left: 0, right: 0, height: ITEM_HEIGHT }}
                                                >
                                                    <div className="color-swatch" style={{ background: c.hex }} />
                                                    <div className="color-hex">{formatColor(c.hex)}</div>
                                                    <div className="color-count" style={{ marginLeft: "auto" }}>
                                                        {c.count}
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return items;
                                    })()}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                {/* 测量随鼠标浮动提示框 */}
                <div className="measure-tip" style={{ display: measureTip.visible ? "block" : "none", left: measureTip.x + 12, top: measureTip.y + 12 }} aria-hidden={!measureTip.visible}>
                    {measureTip.text}
                </div>
                {/* 像素 hover 信息框 */}
                {hoverInfo && hoverInfo.visible && hoverInfo.hex && (
                    <div ref={hoverBoxRef} className="pixel-hover-info" style={{ left: hoverInfo.x, top: hoverInfo.y }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span className="swatch" style={{ background: hoverInfo.hex }} />
                            <span className="value">{colorMode === "hex" ? hoverInfo.hex : hoverInfo.rgb}</span>
                        </div>
                        <div className="meta">点击像素可复制颜色</div>
                    </div>
                )}
                {/* 复制提示已改为全局 Toast 管理 */}
            </div>
        </div>
    );
};
