import express, { Request, Response } from "express";
import cors from "cors";
import { z } from "zod";
import { generatePalette, listSchemes } from "./services/palette.js";
import { contrastRatio } from "./services/contrast.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req: Request, res: Response) => res.json({ ok: true }));

app.get("/api/schemes", (_req: Request, res: Response) => {
    res.json(listSchemes());
});

app.post("/api/palette", (req: Request, res: Response) => {
    const bodySchema = z.object({ base: z.string(), scheme: z.string().default("complementary") });
    const body = bodySchema.parse(req.body);
    try {
        const data = generatePalette(body.base, body.scheme as any);
        res.json(data);
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

app.post("/api/contrast", (req: Request, res: Response) => {
    const bodySchema = z.object({ fg: z.string(), bg: z.string() });
    const body = bodySchema.parse(req.body);
    try {
        const ratio = contrastRatio(body.fg, body.bg);
        res.json(ratio);
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Backend listening on ${port}`));
