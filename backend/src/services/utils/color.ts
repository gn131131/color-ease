// Basic color utility functions without external deps
// Colors represented as RGB array [r,g,b] 0-255

export function parseHex(hex: string): number[] {
    const cleaned = hex.trim().replace(/^#/, "");
    if (!/^([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(cleaned)) throw new Error("Invalid hex");
    const full =
        cleaned.length === 3
            ? cleaned
                  .split("")
                  .map((c) => c + c)
                  .join("")
            : cleaned;
    const num = parseInt(full, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function toHex(rgb: number[]): string {
    return "#" + rgb.map((v) => v.toString(16).padStart(2, "0")).join("");
}

export function toHsl(rgb: number[]) {
    const [r, g, b] = rgb.map((v) => v / 255);
    const max = Math.max(r, g, b),
        min = Math.min(r, g, b);
    let h = 0,
        s = 0;
    const l = (max + min) / 2;
    const d = max - min;
    if (d !== 0) {
        s = d / (1 - Math.abs(2 * l - 1));
        switch (max) {
            case r:
                h = ((g - b) / d) % 6;
                break;
            case g:
                h = (b - r) / d + 2;
                break;
            case b:
                h = (r - g) / d + 4;
                break;
        }
        h *= 60;
        if (h < 0) h += 360;
    }
    return { h: Math.round(h), s: +(s * 100).toFixed(1), l: +(l * 100).toFixed(1) };
}

export function rotateHue(rgb: number[], degrees: number) {
    const hsl = toHsl(rgb);
    const newHue = (hsl.h + degrees + 360) % 360;
    return hslToRgb(newHue, hsl.s, hsl.l);
}

export function lightenDarken(rgb: number[], delta: number) {
    const hsl = toHsl(rgb);
    return hslToRgb(hsl.h, hsl.s, clamp(hsl.l + delta, 0, 100));
}

function clamp(v: number, min: number, max: number) {
    return Math.min(max, Math.max(min, v));
}

function hslToRgb(h: number, sPercent: number, lPercent: number): number[] {
    const s = sPercent / 100;
    const l = lPercent / 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0,
        g = 0,
        b = 0;
    if (h < 60) {
        r = c;
        g = x;
        b = 0;
    } else if (h < 120) {
        r = x;
        g = c;
        b = 0;
    } else if (h < 180) {
        r = 0;
        g = c;
        b = x;
    } else if (h < 240) {
        r = 0;
        g = x;
        b = c;
    } else if (h < 300) {
        r = x;
        g = 0;
        b = c;
    } else {
        r = c;
        g = 0;
        b = x;
    }
    return [r, g, b].map((v) => Math.round((v + m) * 255));
}

export function relativeLuminance(rgb: number[]): number {
    const srgb = rgb.map((v) => v / 255).map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
    return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}
