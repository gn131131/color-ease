import express from "express";

const app = express();

app.get("/health", (_req, res) => res.json({ ok: true }));

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Backend listening on ${port}`));
