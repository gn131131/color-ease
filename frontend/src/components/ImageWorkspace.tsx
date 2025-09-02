import React, { useCallback, useEffect, useRef, useState } from "react";

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

export const ImageWorkspace: React.FC<{ tool: Tool; setTool: (t: Tool) => void }> = ({ tool, setTool }) => {
    const [images, setImages] = useState<LoadedImage[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [scale, setScale] = useState(1);
    const [minScale, setMinScale] = useState(1);
    const spacePressedRef = useRef(false);
    const tabPressedRef = useRef(false);
    const [, forceKeyState] = useState(0);
    const [color, setColor] = useState<string>("无");
    const [measure, setMeasure] = useState<{ start: { x: number; y: number } | null; end: { x: number; y: number } | null; distance: number | null }>({ start: null, end: null, distance: null });
    const [status, setStatus] = useState<string>("");

    const containerRef = useRef<HTMLDivElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const offscreenRef = useRef<HTMLCanvasElement | null>(null);
    const viewState = useRef({ x: 0, y: 0, dragging: false, lastX: 0, lastY: 0 });
    const isInteractingRef = useRef(false);
    const interactionTimerRef = useRef<number | null>(null);
    const scaleRef = useRef(scale);
    const debugRef = useRef(true); // 打开调试日志
    const shiftPressedRef = useRef(false);
    const snappingRef = useRef<{ active: boolean; axis: "h" | "v" | null; x?: number; y?: number }>({ active: false, axis: null });
    const [infoPanelPosition, setInfoPanelPosition] = useState<"top" | "bottom">("top");

    const activeImage = images.find((i) => i.id === activeId) || null;

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
            const toScreen = (ix: number, iy: number) => ({ sx: cx + ix * pixelScale, sy: cy + iy * pixelScale });
            const s1 = toScreen(measure.start.x, measure.start.y);
            const s2 = toScreen(measure.end.x, measure.end.y);
            ctx.save();
            ctx.strokeStyle = "#ffeb3b";
            ctx.fillStyle = "#ffeb3b";
            ctx.lineWidth = Math.max(1 / dpr, 1);
            ctx.beginPath();
            ctx.moveTo(s1.sx, s1.sy);
            ctx.lineTo(s2.sx, s2.sy);
            ctx.stroke();
            if (measure.distance) {
                ctx.font = "12px sans-serif";
                ctx.fillText(measure.distance.toFixed(1) + "px", (s1.sx + s2.sx) / 2 + 4, (s1.sy + s2.sy) / 2 + 4);
            }
            ctx.restore();
        }

        // 吸附视觉提示：当用户按住 shift 并在测量中时，绘制锁定轴线（虚线）
        if (snappingRef.current.active && measure.start) {
            const start = measure.start;
            const axis = snappingRef.current.axis;
            ctx.save();
            ctx.strokeStyle = "rgba(255,200,60,0.85)";
            ctx.setLineDash([6, 6]);
            ctx.lineWidth = Math.max(1 / dpr, 1);
            if (axis === "h") {
                const y = cy + start.y * pixelScale;
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(box.width, y);
                ctx.stroke();
            } else if (axis === "v") {
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

    // 鼠标事件
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
            setStatus(`缩放: ${(newScale / minScale).toFixed(2)}x (滚轮)`);
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
            viewState.current.lastX = e.clientX;
            viewState.current.lastY = e.clientY;
        } else if (tool === "picker") {
            const pos = toImageCoord(e.clientX, e.clientY);
            if (pos) pickColorAt(pos.x, pos.y);
        } else if (tool === "measure") {
            const pos = toImageCoord(e.clientX, e.clientY);
            if (pos) {
                setMeasure({ start: { x: Math.floor(pos.x), y: Math.floor(pos.y) }, end: null, distance: null });
                // reset snapping
                snappingRef.current = { active: !!e.shiftKey, axis: null };
            }
        }
    };
    const handlePointerMove: React.PointerEventHandler<HTMLCanvasElement> = (e) => {
        // update shift state each move
        shiftPressedRef.current = e.shiftKey;
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
            if (pos) setStatus(`位置: ${Math.floor(pos.x)},${Math.floor(pos.y)}`);
        } else if (tool === "measure") {
            if (measure.start) {
                const pos = toImageCoord(e.clientX, e.clientY);
                if (pos) {
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
                    const dist = Math.sqrt(dx2 * dx2 + dy2 * dy2);
                    setMeasure((m) => ({ ...m, end, distance: dist }));
                    draw();
                }
            }
        }
    };
    const handlePointerUp: React.PointerEventHandler<HTMLCanvasElement> = (e) => {
        if (viewState.current.dragging) {
            viewState.current.dragging = false;
            clampView();
            draw();
        }
        // clear shift/snapping when pointer released
        shiftPressedRef.current = false;
        snappingRef.current = { active: false, axis: null };
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
        setColor(hex.toUpperCase());
        setStatus(`取色: ${hex.toUpperCase()}`);
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
                    {images.length === 0 && <div className="empty">暂无图片</div>}
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
                    className={tool === "measure" ? "cursor-measure" : spacePressedRef.current ? "cursor-pan" : tabPressedRef.current ? "cursor-zoom" : "cursor-cross"}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                />

                <div className={`info-panel ${infoPanelPosition}`} onMouseEnter={() => setInfoPanelPosition((p) => (p === "top" ? "bottom" : "top"))}>
                    <div className="info-content">
                        <div className="info-line small">取色：{color}</div>
                        {measure.distance && measure.start && measure.end && <div className="info-line small">{measure.distance.toFixed(1)} px</div>}
                        <div className="info-line small measure-hint">{status}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};
