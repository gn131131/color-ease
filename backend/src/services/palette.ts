import { parseHex, toHex, toHsl, rotateHue, lightenDarken } from "./utils/color.js";

export type Scheme = "complementary" | "analogous" | "triadic" | "tetradic" | "monochromatic";

export function listSchemes() {
    return { schemes: ["complementary", "analogous", "triadic", "tetradic", "monochromatic"] as Scheme[] };
}

export function generatePalette(baseHex: string, scheme: Scheme) {
    const base = parseHex(baseHex);
    switch (scheme) {
        case "complementary":
            return complementary(base);
        case "analogous":
            return analogous(base);
        case "triadic":
            return triadic(base);
        case "tetradic":
            return tetradic(base);
        case "monochromatic":
            return monochromatic(base);
        default:
            throw new Error("Unknown scheme");
    }
}

function complementary(base: number[]) {
    const comp = rotateHue(base, 180);
    return wrap("complementary", [base, comp]);
}
function analogous(base: number[]) {
    return wrap("analogous", [rotateHue(base, -30), base, rotateHue(base, 30)]);
}
function triadic(base: number[]) {
    return wrap("triadic", [base, rotateHue(base, 120), rotateHue(base, 240)]);
}
function tetradic(base: number[]) {
    return wrap("tetradic", [base, rotateHue(base, 90), rotateHue(base, 180), rotateHue(base, 270)]);
}
function monochromatic(base: number[]) {
    return wrap("monochromatic", [lightenDarken(base, -30), base, lightenDarken(base, 20), lightenDarken(base, 40)]);
}

function wrap(name: string, colors: number[][]) {
    return {
        scheme: name,
        colors: colors.map((c) => ({ hex: toHex(c), hsl: toHsl(c) }))
    };
}
