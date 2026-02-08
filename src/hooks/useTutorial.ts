import { useState, useEffect } from "react";

const TUTORIAL_STORAGE_KEY = "organiza-tutorial-completed";

export function useTutorial() {
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    const tutorialCompleted = localStorage.getItem(TUTORIAL_STORAGE_KEY);
    if (!tutorialCompleted) {
      // Pequeno delay para o tutorial aparecer após a página carregar
      const timer = setTimeout(() => {
        setShowTutorial(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const completeTutorial = () => {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, "true");
    setShowTutorial(false);
  };

  const resetTutorial = () => {
    localStorage.removeItem(TUTORIAL_STORAGE_KEY);
    setShowTutorial(true);
  };

  return {
    showTutorial,
    completeTutorial,
    resetTutorial,
  };
}
