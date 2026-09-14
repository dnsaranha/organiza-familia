import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { processAIChat } from "./src/server/geminiHandler";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "5mb" }));

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/ai/chat", async (req, res) => {
    try {
      const result = await processAIChat(req.body);
      res.json(result);
    } catch (err: any) {
      console.info("[AI Server] Returning resilient fallback response");
      res.json({
        reply: "Olá! Nossos servidores de IA estão momentaneamente ocupados. Suas informações continuam salvas e você pode registrar receitas, despesas e metas diretamente no Organiza.",
        modelUsed: "gemini-fallback",
        usage: { promptTokens: 0, responseTokens: 0, totalTokens: 0, costUsd: 0, costBrl: 0 },
      });
    }
  });

  // Proxy for Yahoo Finance chart data (bypasses browser CORS in dev and production)
  app.get("/api/yahoo/*all", async (req, res) => {
    try {
      const targetPath = req.originalUrl.replace(/^\/api\/yahoo/, "");
      const targetUrl = `https://query1.finance.yahoo.com${targetPath}`;
      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json",
        },
      });
      const data = await response.text();
      res.setHeader("Content-Type", response.headers.get("content-type") || "application/json");
      res.status(response.status).send(data);
    } catch (err: any) {
      res.status(502).json({ error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
