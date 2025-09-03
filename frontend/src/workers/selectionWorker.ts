// Worker for computing selection statistics and building color index
// Messages:
// { type: 'init', width, height, data: ArrayBuffer }
// { type: 'stats', sx, sy, w, h, requestId }
// { type: 'buildIndex', sx, sy, w, h, requestId }
// Responses:
// { type: 'statsResult', requestId, colors: [{hex, count}] }
// { type: 'indexResult', requestId, index: { [hex]: number[] } } // coords flat [x,y,x,y,...]

let width = 0;
let height = 0;
let data: Uint8ClampedArray | null = null;

function toHex(r: number, g: number, b: number) {
    return ("#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")).toUpperCase();
}

self.onmessage = (ev) => {
    const msg = ev.data;
    try {
        if (!msg || !msg.type) return;
        if (msg.type === "init") {
            width = msg.width;
            height = msg.height;
            // msg.data is an ArrayBuffer we can wrap
            if (msg.data) {
                data = new Uint8ClampedArray(msg.data);
            } else {
                data = null;
            }
            return;
        }
        if (msg.type === "stats") {
            const { sx, sy, w, h, requestId } = msg;
            if (!data) {
                postMessage({ type: "statsResult", requestId, colors: [] });
                return;
            }
            const map = new Map();
            for (let yy = 0; yy < h; yy++) {
                const rowStart = ((sy + yy) * width + sx) * 4;
                for (let xx = 0; xx < w; xx++) {
                    const idx = rowStart + xx * 4;
                    const a = data[idx + 3];
                    if (a === 0) continue;
                    const r = data[idx];
                    const g = data[idx + 1];
                    const b = data[idx + 2];
                    const hex = toHex(r, g, b);
                    map.set(hex, (map.get(hex) || 0) + 1);
                }
            }
            const arr = Array.from(map.entries()).map(([hex, count]) => ({ hex, count }));
            arr.sort((a, b) => b.count - a.count);
            postMessage({ type: "statsResult", requestId, colors: arr });
            return;
        }
        if (msg.type === "buildIndex") {
            const { sx, sy, w, h, requestId } = msg;
            if (!data) {
                postMessage({ type: "indexResult", requestId, index: {} });
                return;
            }
            const indexObj: { [hex: string]: number[] } = {};
            for (let yy = 0; yy < h; yy++) {
                const rowStart = ((sy + yy) * width + sx) * 4;
                for (let xx = 0; xx < w; xx++) {
                    const idx = rowStart + xx * 4;
                    const a = data[idx + 3];
                    if (a === 0) continue;
                    const r = data[idx];
                    const g = data[idx + 1];
                    const b = data[idx + 2];
                    const hex = toHex(r, g, b);
                    if (!indexObj[hex]) indexObj[hex] = [];
                    indexObj[hex].push(sx + xx, sy + yy);
                }
            }
            postMessage({ type: "indexResult", requestId, index: indexObj });
            return;
        }
    } catch (err) {
        // if worker fails, report back failure for that request
        if (msg && msg.requestId) {
            postMessage({ type: "error", requestId: msg.requestId, message: String(err) });
        }
    }
};
