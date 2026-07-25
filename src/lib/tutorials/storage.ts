const PREFIX = "organiza-tutorial";

const key = (id: string, kind: "completed" | "dismissed") =>
  `${PREFIX}:${id}:${kind}`;

export const isTutorialCompleted = (id: string) => {
  try {
    return localStorage.getItem(key(id, "completed")) === "1";
  } catch {
    return false;
  }
};

export const isTutorialDismissed = (id: string) => {
  try {
    return localStorage.getItem(key(id, "dismissed")) === "1";
  } catch {
    return false;
  }
};

export const markTutorialCompleted = (id: string) => {
  try {
    localStorage.setItem(key(id, "completed"), "1");
  } catch {
    // ignore
  }
};

export const markTutorialDismissed = (id: string) => {
  try {
    localStorage.setItem(key(id, "dismissed"), "1");
  } catch {
    // ignore
  }
};

export const resetTutorial = (id: string) => {
  try {
    localStorage.removeItem(key(id, "completed"));
    localStorage.removeItem(key(id, "dismissed"));
  } catch {
    // ignore
  }
};

/** Whether the first-visit prompt for this tutorial should be shown. */
export const shouldPromptTutorial = (id: string) =>
  !isTutorialCompleted(id) && !isTutorialDismissed(id);