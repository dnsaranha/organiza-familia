import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("❌ Uncaught error at:", new Date().toISOString());
    console.error("Error:", error);
    console.error("Error Info:", errorInfo);
    console.error("Component Stack:", errorInfo.componentStack);

    // Automatically reload if it's a chunk load error (common after deployments)
    const message = (error?.message ?? "").toLowerCase();
    if (
      message.includes("failed to fetch dynamically imported module") ||
      message.includes("importing a module script failed") ||
      message.includes("loading chunk") ||
      message.includes("chunkloaderror")
    ) {
      console.log("Chunk load error detected, reloading...");
      window.location.reload();
      return;
    }

    // Avoid calling a non-existent global (can itself cause a Script error in some environments)
    try {
      const reporter = (typeof window !== "undefined" && (window as any)?.reportError)
        ? (window as any).reportError
        : null;
      if (typeof reporter === "function") reporter(error);
    } catch {
      // no-op
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
