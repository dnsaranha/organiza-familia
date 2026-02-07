import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Add startup logging
console.log("🚀 App initialization started at:", new Date().toISOString());

// Add error handling for the root element
const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("❌ Root element not found");
  throw new Error("Root element not found");
}

try {
  console.log("📦 Creating React root...");
  const root = createRoot(rootElement);

  console.log("🎨 Rendering App component...");
  root.render(<App />);

  console.log("✅ App rendered successfully at:", new Date().toISOString());
} catch (error) {
  console.error("❌ Failed to render app:", error);

  // Fallback error display
  rootElement.innerHTML = `
    <div style="
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #f9fafb;
      font-family: system-ui, -apple-system, sans-serif;
    ">
      <div style="text-align: center; padding: 2rem;">
        <h1 style="font-size: 1.5rem; font-weight: bold; color: #111827; margin-bottom: 1rem;">
          App Failed to Start
        </h1>
        <p style="color: #6b7280; margin-bottom: 1rem;">
          There was an error initializing the application.
        </p>
        <button 
          onclick="window.location.reload()" 
          style="
            padding: 0.5rem 1rem;
            background-color: #3b82f6;
            color: white;
            border: none;
            border-radius: 0.375rem;
            cursor: pointer;
          "
        >
          Reload Page
        </button>
        <details style="margin-top: 1rem; text-align: left;">
          <summary style="cursor: pointer; color: #6b7280;">Error Details</summary>
          <pre style="
            margin-top: 0.5rem;
            padding: 1rem;
            background-color: #f3f4f6;
            border-radius: 0.375rem;
            font-size: 0.875rem;
            overflow: auto;
          ">${error instanceof Error ? error.stack : String(error)}</pre>
        </details>
      </div>
    </div>
  `;
}

// Defer service worker registration to avoid blocking startup
setTimeout(() => {
  if ("serviceWorker" in navigator) {
    console.log("🔧 Registering service worker...");
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((registration) => {
        console.log(
          "✅ Service Worker registered with scope:",
          registration.scope,
        );
      })
      .catch((error) => {
        console.warn("⚠️ Service Worker registration failed:", error);
      });
  }
}, 1000);
