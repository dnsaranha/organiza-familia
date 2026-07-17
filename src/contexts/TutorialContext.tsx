import * as React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Joyride, EVENTS, STATUS, type EventData } from "react-joyride";
import { toast } from "sonner";

import { tutorials, getTutorial, type TutorialDefinition } from "@/lib/tutorials/registry";
import {
  markTutorialCompleted,
  markTutorialDismissed,
  resetTutorial,
  shouldPromptTutorial,
} from "@/lib/tutorials/storage";
import { useAuth } from "@/hooks/useAuth";

interface TutorialContextValue {
  tutorials: TutorialDefinition[];
  startTutorial: (id: string) => void;
  stopTutorial: () => void;
  restartTutorial: (id: string) => void;
  activeTutorialId: string | null;
}

const TutorialContext = React.createContext<TutorialContextValue | null>(null);

export const useTutorial = () => {
  const ctx = React.useContext(TutorialContext);
  if (!ctx) throw new Error("useTutorial must be used within TutorialProvider");
  return ctx;
};

export const TutorialProvider = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [run, setRun] = React.useState(false);
  const promptedRef = React.useRef<Set<string>>(new Set());
  const activeToastRef = React.useRef<string | number | null>(null);

  const active = activeId ? getTutorial(activeId) : null;

  const startTutorial = React.useCallback((id: string) => {
    const t = getTutorial(id);
    if (!t) return;
    // If the tutorial has a start route and we're elsewhere, navigate there first.
    if (t.startRoute && location.pathname !== t.startRoute) {
      navigate(t.startRoute);
    }
    setActiveId(id);
    // Delay slightly so target elements exist in the DOM (especially after route change).
    window.setTimeout(() => setRun(true), 300);
  }, [location.pathname, navigate]);

  const stopTutorial = React.useCallback(() => {
    setRun(false);
    setActiveId(null);
  }, []);

  const restartTutorial = React.useCallback(
    (id: string) => {
      resetTutorial(id);
      startTutorial(id);
    },
    [startTutorial],
  );

  // First-visit prompt: any tutorial with autoPromptOnRoute matching current path.
  React.useEffect(() => {
    if (activeId) return;
    if (authLoading || !user) return; // only prompt authenticated users
    const path = location.pathname;

    // Dismiss stale prompt if user navigated away from a matching route.
    if (activeToastRef.current !== null) {
      toast.dismiss(activeToastRef.current);
      activeToastRef.current = null;
    }

    for (const t of tutorials) {
      if (!t.autoPromptOnRoute) continue;
      const routes = Array.isArray(t.autoPromptOnRoute)
        ? t.autoPromptOnRoute
        : [t.autoPromptOnRoute];
      if (!routes.includes(path)) continue;
      if (!shouldPromptTutorial(t.id)) continue;
      if (promptedRef.current.has(t.id)) continue;
      promptedRef.current.add(t.id);

      const toastId = toast(`Tutorial disponível: ${t.title}`, {
        description: t.description,
        duration: 15000,
        action: {
          label: "Ver tutorial",
          onClick: () => startTutorial(t.id),
        },
        cancel: {
          label: "Não mostrar novamente",
          onClick: () => {
            markTutorialDismissed(t.id);
            toast.dismiss(toastId);
          },
        },
      });
      activeToastRef.current = toastId;
      break; // one prompt at a time
    }
  }, [location.pathname, activeId, startTutorial, user, authLoading]);

  const handleEvent = React.useCallback((data: EventData) => {
    const { type, status } = data;
    if (type === EVENTS.TOUR_END) {
      if (activeId && (status === STATUS.FINISHED)) {
        markTutorialCompleted(activeId);
      }
      if (activeId && status === STATUS.SKIPPED) {
        // If the user skipped explicitly, treat as dismissed so we don't nag.
        markTutorialDismissed(activeId);
      }
      setRun(false);
      setActiveId(null);
    }
  }, [activeId]);

  const value = React.useMemo<TutorialContextValue>(
    () => ({ tutorials, startTutorial, stopTutorial, restartTutorial, activeTutorialId: activeId }),
    [startTutorial, stopTutorial, restartTutorial, activeId],
  );

  return (
    <TutorialContext.Provider value={value}>
      {children}
      {active && (
        <Joyride
          key={active.id}
          steps={active.steps}
          run={run}
          continuous
          onEvent={handleEvent}
          options={{
            showProgress: true,
            primaryColor: "hsl(var(--primary))",
            zIndex: 10000,
            buttons: ["back", "skip", "primary"],
            overlayClickAction: false,
            dismissKeyAction: "close",
            targetWaitTimeout: 4000,
          }}
          styles={{
            // The overlay in this version intercepts pointer events even when
            // overlayClickAction is false, which blocks clicks on the Joyride
            // tooltip itself. Disable pointer events on the overlay/spotlight
            // so only the tooltip captures clicks.
            overlay: { pointerEvents: "none" },
            spotlight: { style: { pointerEvents: "none", cursor: "default" } },
          }}
          locale={{
            back: "Voltar",
            close: "Fechar",
            last: "Concluir",
            next: "Próximo",
            skip: "Pular",
            nextWithProgress: "Próximo ({current} de {total})",
            open: "Abrir tutorial",
          }}
        />
      )}
    </TutorialContext.Provider>
  );
};