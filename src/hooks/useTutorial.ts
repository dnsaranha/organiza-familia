import { useState, useEffect, useCallback } from "react";

const TUTORIAL_STORAGE_KEY = "organiza-tutorial-completed";
const TASKS_TUTORIAL_STORAGE_KEY = "organiza-tasks-tutorial-completed";

export type TutorialType = "main" | "tasks";

export function useTutorial(type: TutorialType = "main") {
  const [showTutorial, setShowTutorial] = useState(false);

  const storageKey =
    type === "main" ? TUTORIAL_STORAGE_KEY : TASKS_TUTORIAL_STORAGE_KEY;

  useEffect(() => {
    const tutorialCompleted = localStorage.getItem(storageKey);
    if (!tutorialCompleted) {
      // Pequeno delay para o tutorial aparecer após a página carregar
      const timer = setTimeout(() => {
        setShowTutorial(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [storageKey]);

  const completeTutorial = useCallback(() => {
    localStorage.setItem(storageKey, "true");
    setShowTutorial(false);
  }, [storageKey]);

  const resetTutorial = useCallback(() => {
    localStorage.removeItem(storageKey);
    setShowTutorial(true);
  }, [storageKey]);

  const startTutorial = useCallback(() => {
    setShowTutorial(true);
  }, []);

  const resetAllTutorials = useCallback(() => {
    localStorage.removeItem(TUTORIAL_STORAGE_KEY);
    localStorage.removeItem(TASKS_TUTORIAL_STORAGE_KEY);
  }, []);

  return {
    showTutorial,
    completeTutorial,
    resetTutorial,
    startTutorial,
    resetAllTutorials,
    isTutorialActive: showTutorial,
  };
}
