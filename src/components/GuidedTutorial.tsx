import { useState, useEffect, useCallback, useRef } from "react";
import Joyride, { CallBackProps, EVENTS, STATUS, Step } from "react-joyride";
import { useLocation } from "react-router-dom";

const TUTORIAL_STORAGE_KEY = "organiza-tutorial-completed";
const TASKS_TUTORIAL_STORAGE_KEY = "organiza-tasks-tutorial-completed";

const transactionSteps: Step[] = [
  {
    target: "body",
    content: "Bem-vindo ao Organiza! 🎉 Vamos te guiar para criar sua primeira transação financeira.",
    placement: "center",
    disableBeacon: true,
  },
  {
    target: '[data-tutorial="fab-add-transaction"]',
    content: "Clique neste botão para abrir o formulário de nova transação.",
    placement: "top",
    spotlightClicks: true,
    hideFooter: true,
    disableBeacon: true,
  },
  {
    target: '[data-tutorial="transaction-type"]',
    content: "Primeiro, escolha o tipo: Despesa ou Receita.",
    placement: "bottom",
    disableBeacon: true,
  },
  {
    target: '[data-tutorial="transaction-amount"]',
    content: "Digite o valor da transação aqui.",
    placement: "bottom",
    disableBeacon: true,
  },
  {
    target: '[data-tutorial="transaction-category"]',
    content: "Selecione uma categoria para organizar seus gastos.",
    placement: "bottom",
    disableBeacon: true,
  },
  {
    target: '[data-tutorial="transaction-description"]',
    content: "Opcionalmente, adicione uma descrição para identificar a transação.",
    placement: "top",
    disableBeacon: true,
  },
  {
    target: '[data-tutorial="transaction-submit"]',
    content: "Pronto! Clique aqui para salvar sua transação. 🚀",
    placement: "top",
    disableBeacon: true,
  },
];

const tasksSteps: Step[] = [
  {
    target: "body",
    content: "Agora vamos aprender a agendar tarefas! 📋 Tarefas te ajudam a lembrar de pagamentos e compromissos.",
    placement: "center",
    disableBeacon: true,
  },
  {
    target: '[data-tutorial="add-task-btn"]',
    content: "Clique aqui para criar uma nova tarefa agendada.",
    placement: "bottom",
    spotlightClicks: true,
    hideFooter: true,
    disableBeacon: true,
  },
  {
    target: '[data-tutorial="task-title"]',
    content: "Digite o título da tarefa, como 'Pagar conta de luz'.",
    placement: "bottom",
    disableBeacon: true,
  },
  {
    target: '[data-tutorial="task-type"]',
    content: "Escolha o tipo de tarefa: lembrete de pagamento, alerta de orçamento, etc.",
    placement: "bottom",
    disableBeacon: true,
  },
  {
    target: '[data-tutorial="task-value"]',
    content: "Informe o valor associado à tarefa (opcional).",
    placement: "bottom",
    disableBeacon: true,
  },
  {
    target: '[data-tutorial="task-category"]',
    content: "Selecione uma categoria para a tarefa.",
    placement: "bottom",
    disableBeacon: true,
  },
  {
    target: '[data-tutorial="task-date"]',
    content: "Defina a data e horário para ser lembrado.",
    placement: "bottom",
    disableBeacon: true,
  },
  {
    target: '[data-tutorial="task-recurring"]',
    content: "Ative esta opção se a tarefa se repete periodicamente.",
    placement: "top",
    disableBeacon: true,
  },
  {
    target: '[data-tutorial="task-submit"]',
    content: "Clique para salvar sua tarefa agendada! ✅",
    placement: "top",
    disableBeacon: true,
  },
];

type TutorialType = "transactions" | "tasks";

interface GuidedTutorialProps {
  type: TutorialType;
  forceRun?: boolean;
  onComplete?: () => void;
}

// Global flag so other components can check if tutorial is active
let _tutorialRunning = false;
export function isTutorialRunning() {
  return _tutorialRunning;
}

export function GuidedTutorial({ type, forceRun, onComplete }: GuidedTutorialProps) {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const skipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const location = useLocation();

  const storageKey = type === "transactions" ? TUTORIAL_STORAGE_KEY : TASKS_TUTORIAL_STORAGE_KEY;
  const steps = type === "transactions" ? transactionSteps : tasksSteps;

  // Update global flag
  useEffect(() => {
    _tutorialRunning = run;
    return () => { _tutorialRunning = false; };
  }, [run]);

  useEffect(() => {
    if (forceRun) {
      setStepIndex(0);
      setRun(true);
      return;
    }

    const completed = localStorage.getItem(storageKey);
    if (!completed) {
      // Small delay to allow page to render
      const timer = setTimeout(() => {
        setStepIndex(0);
        setRun(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [forceRun, storageKey]);

  // Poll for next step's target element when current step has spotlightClicks (user must interact)
  useEffect(() => {
    if (!run) return;
    const currentStep = steps[stepIndex];
    if (!currentStep?.spotlightClicks) return;

    const nextStep = steps[stepIndex + 1];
    if (!nextStep) return;

    const targetSelector = typeof nextStep.target === "string" ? nextStep.target : null;
    if (!targetSelector || targetSelector === "body") return;

    const interval = setInterval(() => {
      const el = document.querySelector(targetSelector);
      if (el) {
        clearInterval(interval);
        setStepIndex((prev) => prev + 1);
      }
    }, 300);

    return () => clearInterval(interval);
  }, [run, stepIndex, steps]);

  const handleCallback = useCallback(
    (data: CallBackProps) => {
      const { status, type: eventType, index } = data;

      if (eventType === EVENTS.STEP_AFTER) {
        const currentStep = steps[index];
        if (!currentStep?.spotlightClicks) {
          setStepIndex(index + 1);
        }
      }

      if (eventType === EVENTS.TARGET_NOT_FOUND) {
        // Skip missing targets with a delay to prevent infinite cascade
        if (skipTimerRef.current) clearTimeout(skipTimerRef.current);
        skipTimerRef.current = setTimeout(() => {
          setStepIndex((prev) => {
            const next = prev + 1;
            // Don't skip past the end
            return next < steps.length ? next : prev;
          });
        }, 500);
      }

      if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
        setRun(false);
        localStorage.setItem(storageKey, "true");
        onComplete?.();
      }
    },
    [steps, storageKey, onComplete]
  );

  if (!run) return null;

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous
      showSkipButton
      showProgress
      callback={handleCallback}
      disableOverlayClose
      locale={{
        back: "Voltar",
        close: "Fechar",
        last: "Finalizar",
        next: "Próximo",
        skip: "Pular Tutorial",
      }}
      styles={{
        options: {
          zIndex: 10000,
          primaryColor: "hsl(var(--primary))",
        },
        tooltip: {
          borderRadius: "12px",
          padding: "16px",
        },
        buttonNext: {
          borderRadius: "8px",
          padding: "8px 16px",
        },
        buttonBack: {
          marginRight: 8,
        },
      }}
    />
  );
}

// Helper to reset tutorials
export function resetTutorial(type: TutorialType) {
  const key = type === "transactions" ? TUTORIAL_STORAGE_KEY : TASKS_TUTORIAL_STORAGE_KEY;
  localStorage.removeItem(key);
}

export function isTutorialCompleted(type: TutorialType): boolean {
  const key = type === "transactions" ? TUTORIAL_STORAGE_KEY : TASKS_TUTORIAL_STORAGE_KEY;
  return localStorage.getItem(key) === "true";
}
