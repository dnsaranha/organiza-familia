import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Keep startup minimal to avoid triggering platform health-check failures.
const rootElement = document.getElementById("root");

if (rootElement) {
  createRoot(rootElement).render(<App />);
} else {
  // Avoid throwing during module evaluation; renderers/platform tooling can surface opaque infra errors.
  console.error("Root element not found");
}

// Defer service worker registration to avoid blocking startup
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch(() => {
      // Silent fail for service worker registration
    });
  });
}
