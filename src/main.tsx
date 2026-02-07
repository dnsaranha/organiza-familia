import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Avoid console usage in environments where it can throw (e.g., some cross-origin iframe contexts)
const safeLog = {
  log: (...args: unknown[]) => {
    try {
      // eslint-disable-next-line no-console
      console.log(...args);
    } catch {
      // no-op
    }
  },
  warn: (...args: unknown[]) => {
    try {
      // eslint-disable-next-line no-console
      console.warn(...args);
    } catch {
      // no-op
    }
  },
  error: (...args: unknown[]) => {
    try {
      // eslint-disable-next-line no-console
      console.error(...args);
    } catch {
      // no-op
    }
  },
};

safeLog.log("App initialization started at:", new Date().toISOString());

const rootElement = document.getElementById("root");
if (!rootElement) {
  safeLog.error("Root element not found");
  throw new Error("Root element not found");
}

try {
  safeLog.log("Creating React root...");
  const root = createRoot(rootElement);

  safeLog.log("Rendering App component...");
  root.render(<App />);

  safeLog.log("App rendered successfully at:", new Date().toISOString());
} catch (error) {
  safeLog.error("Failed to render app:", error);

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
    safeLog.log("Registering service worker...");
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((registration) => {
        safeLog.log("Service Worker registered with scope:", registration.scope);
      })
      .catch((error) => {
        safeLog.warn("Service Worker registration failed:", error);
      });
  }
}, 1000);
