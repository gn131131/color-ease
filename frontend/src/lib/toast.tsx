import React from "react";

type Toast = { id: string; text: string; leaving?: boolean };

type ToastContextType = {
    show: (text: string, ttl?: number) => void;
};

const ToastCtx = React.createContext<ToastContextType | null>(null);

export const ToastProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
    const [toasts, setToasts] = React.useState<Toast[]>([]);

    const show = (text: string, ttl = 1200) => {
        const id = crypto.randomUUID();
        setToasts((t) => [...t, { id, text }]);
        // 标记离场并在动画结束后移除
        const leaveMs = 220;
        window.setTimeout(() => {
            setToasts((t) => t.map((x) => (x.id === id ? { ...x, leaving: true } : x)));
        }, Math.max(0, ttl - leaveMs));
        window.setTimeout(() => {
            setToasts((t) => t.filter((x) => x.id !== id));
        }, ttl);
    };

    return (
        <ToastCtx.Provider value={{ show }}>
            {children}
            <div aria-live="polite" style={{ position: "fixed", left: 0, right: 0, top: 18, zIndex: 110, pointerEvents: "none" }}>
                <div style={{ display: "flex", justifyContent: "center", gap: 8, pointerEvents: "none" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
                        {toasts.map((t) => (
                            <div key={t.id} className={`copy-toast ${t.leaving ? "leaving" : "visible"}`} style={{ pointerEvents: "auto" }}>
                                {t.text}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </ToastCtx.Provider>
    );
};

export function useToast() {
    const ctx = React.useContext(ToastCtx);
    if (!ctx) throw new Error("ToastProvider missing");
    return ctx;
}
