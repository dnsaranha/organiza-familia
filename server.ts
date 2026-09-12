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
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
