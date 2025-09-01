import React, { useState } from "react";

export const ColorPicker: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => {
    const [manual, setManual] = useState(value);
    return (
        <div>
            <h3>Color Picker</h3>
            <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
            <input value={manual} onChange={(e) => setManual(e.target.value)} onBlur={() => manual && onChange(manual)} />
        </div>
    );
};
