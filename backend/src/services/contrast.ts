import { parseHex, relativeLuminance } from "./utils/color.js";

export function contrastRatio(fgHex: string, bgHex: string) {
    const fg = parseHex(fgHex);
    const bg = parseHex(bgHex);
    const L1 = relativeLuminance(fg);
    const L2 = relativeLuminance(bg);
    const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const level = ratio >= 7 ? "AAA" : ratio >= 4.5 ? "AA" : ratio >= 3 ? "AA Large" : "Fail";
    return { ratio: +ratio.toFixed(2), level };
}
