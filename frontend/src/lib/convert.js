export function hexToRgb(hex) {
    const cleaned = hex.replace("#", "");
    const full = cleaned.length === 3
        ? cleaned
            .split("")
            .map((c) => c + c)
            .join("")
        : cleaned;
    const num = parseInt(full, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}
export function hexToHsl(hex) {
    const { r, g, b } = hexToRgb(hex);
    const R = r / 255, G = g / 255, B = b / 255;
    const max = Math.max(R, G, B), min = Math.min(R, G, B);
    let h = 0;
    const l = (max + min) / 2;
    const d = max - min;
    let s = 0;
    if (d !== 0) {
        s = d / (1 - Math.abs(2 * l - 1));
        switch (max) {
            case R:
                h = ((G - B) / d) % 6;
                break;
            case G:
                h = (B - R) / d + 2;
                break;
            case B:
                h = (R - G) / d + 4;
                break;
        }
        h *= 60;
        if (h < 0)
            h += 360;
    }
    return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}
