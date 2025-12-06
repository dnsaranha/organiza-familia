import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0", // Listen on all network interfaces
    port: 9002,      // Match the port from the error message
    hmr: {
      // Tell the client to connect to the public-facing port for HMR
      clientPort: 9000,
    },
    // Optimize for faster startup
    warmup: {
      clientFiles: ["./src/main.tsx", "./src/App.tsx"],
    },
  },
  // Optimize build for faster startup
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@tanstack/react-query",
      "@supabase/supabase-js",
    ],
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(
    Boolean
  ),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
