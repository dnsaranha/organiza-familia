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
      console.error("AI Chat error:", err);
      res.status(500).json({ error: err?.message || "Erro ao processar mensagem com a IA" });
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
