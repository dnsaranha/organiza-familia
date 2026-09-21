import express from "express";
import path from "path";
import { processAIChat } from "./src/server/geminiHandler";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Enable CORS for all incoming requests (preview, production, and external clients)
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-client-info, apikey");
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    next();
  });

  app.use(express.json({ limit: "5mb" }));

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.post("/api/ai/chat", async (req, res) => {
    try {
      const result = await processAIChat(req.body);
      res.json(result);
    } catch (err: any) {
      console.error("[AI Server] Error in processAIChat:", err?.message || err);
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

  // Determine if running in production bundle or dev
  const isProduction =
    process.env.NODE_ENV === "production" ||
    process.env.VITE_PROD === "true" ||
    (typeof __filename !== "undefined" && __filename.includes("dist")) ||
    (Boolean(process.argv[1]) && process.argv[1].includes("dist"));

  if (!isProduction) {
    // Dynamically load Vite middleware only in development
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve the compiled static build
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT} [mode: ${isProduction ? 'production' : 'development'}]`);
  });
}

startServer();
