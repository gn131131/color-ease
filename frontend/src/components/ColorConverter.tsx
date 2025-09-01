import React from "react";
import { hexToRgb, hexToHsl } from "../lib/convert";

export const ColorConverter: React.FC<{ color: string }> = ({ color }) => {
    const rgb = hexToRgb(color);
    const hsl = hexToHsl(color);
    return (
        <div>
            <h3>Format</h3>
            <p>
                HEX: <code>{color}</code>
            </p>
            <p>
                RGB:{" "}
                <code>
                    {rgb.r}, {rgb.g}, {rgb.b}
                </code>
            </p>
            <p>
                HSL:{" "}
                <code>
                    {hsl.h} {hsl.s}% {hsl.l}%
                </code>
            </p>
        </div>
    );
};
