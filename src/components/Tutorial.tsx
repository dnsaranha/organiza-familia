import Joyride, { CallBackProps, STATUS, Step } from "react-joyride";
import { useTutorial, TutorialType } from "@/hooks/useTutorial";
import { useState, useEffect } from "react";

interface TutorialProps {
  type?: TutorialType;
  onComplete?: () => void;
}

const tooltipStyles = {
  options: {
    primaryColor: "hsl(var(--primary))",
    zIndex: 10000,
    arrowColor: "hsl(var(--card))",
    backgroundColor: "hsl(var(--card))",
    textColor: "hsl(var(--card-foreground))",
  },
  tooltip: {
    borderRadius: "12px",
    padding: "20px",
    backgroundColor: "hsl(var(--card))",
    color: "hsl(var(--card-foreground))",
    boxShadow: "0 8px 30px rgba(0, 0, 0, 0.12)",
    zIndex: 10001,
  },
  tooltipContainer: {
    zIndex: 10001,
  },
  overlay: {
    zIndex: 9999,
  },
  tooltipContent: {
    color: "hsl(var(--card-foreground))",
  },
  buttonNext: {
    backgroundColor: "hsl(var(--primary))",
    color: "hsl(var(--primary-foreground))",
    borderRadius: "6px",
    padding: "8px 16px",
    fontSize: "14px",
  },
  buttonBack: {
    marginRight: "10px",
    color: "hsl(var(--muted-foreground))",
  },
  buttonSkip: {
    color: "hsl(var(--muted-foreground))",
  },
  spotlight: {
    borderRadius: "8px",
  },
};

const locale = {
  back: "Voltar",
  close: "Fechar",
  last: "Finalizar",
  next: "Próximo",
  skip: "Pular tutorial",
};

function getMainSteps(): Step[] {
  return [
    {
      target: "body",
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">
            Bem-vindo ao Organiza! 🎉
          </h3>
          <p className="text-sm opacity-80">
            Vamos fazer um tour rápido para você começar a gerenciar suas
            finanças. Este tutorial mostrará como adicionar sua primeira
            transação.
          </p>
        </div>
      ),
      placement: "center",
      disableBeacon: true,
    },
    {
      target: '[data-tutorial="add-transaction-button"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Adicionar Transação ➕</h3>
          <p className="text-sm opacity-80">
            Clique neste botão para adicionar uma nova receita ou despesa. Vamos
            começar adicionando uma receita!
          </p>
        </div>
      ),
      placement: "top",
      disableBeacon: true,
      spotlightClicks: true,
      disableScrolling: false,
    },
    {
      target: '[data-tutorial="transaction-type"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Tipo de Transação</h3>
          <p className="text-sm opacity-80">
            Escolha se é uma <strong>Receita</strong> (dinheiro que entra) ou{" "}
            <strong>Despesa</strong> (dinheiro que sai).
          </p>
        </div>
      ),
      placement: "top",
      disableBeacon: true,
      spotlightClicks: true,
      disableScrolling: true,
    },
    {
      target: '[data-tutorial="transaction-amount"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Valor 💰</h3>
          <p className="text-sm opacity-80">
            Digite o valor da transação e clique em "Próximo". O sistema já formata automaticamente
            como moeda.
          </p>
        </div>
      ),
      placement: "top",
      disableBeacon: true,
      spotlightClicks: true,
      disableScrolling: true,
    },
    {
      target: '[data-tutorial="transaction-category"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Categoria 📂</h3>
          <p className="text-sm opacity-80">
            Clique aqui para escolher uma categoria para organizar melhor suas finanças. Isso
            ajuda nos relatórios!
          </p>
        </div>
      ),
      placement: "top",
      disableBeacon: true,
      spotlightClicks: true,
      disableScrolling: true,
      spotlightPadding: 150,
    },
    {
      target: '[data-tutorial="transaction-date"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Data 📅</h3>
          <p className="text-sm opacity-80">
            Selecione a data da transação. Por padrão, já vem com a data de
            hoje.
          </p>
        </div>
      ),
      placement: "bottom",
      disableBeacon: true,
      spotlightClicks: true,
      disableScrolling: true,
    },
    {
      target: '[data-tutorial="transaction-description"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Descrição ✏️</h3>
          <p className="text-sm opacity-80">
            Digite uma descrição para sua transação. Por exemplo: "Salário",
            "Freelance", etc.
          </p>
        </div>
      ),
      placement: "bottom",
      disableBeacon: true,
      spotlightClicks: true,
      disableScrolling: true,
    },
    {
      target: '[data-tutorial="submit-transaction"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Salvar Transação ✅</h3>
          <p className="text-sm opacity-80">
            Clique aqui para salvar sua transação. Pronto! Sua transação será
            registrada.
          </p>
        </div>
      ),
      placement: "top",
      disableBeacon: true,
      spotlightClicks: true,
      disableScrolling: false,
      scrollToFirstStep: true,
    },
    {
      target: '[data-tutorial="transaction-list"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">
            Lista de Transações 📊
          </h3>
          <p className="text-sm opacity-80">
            Todas as suas transações aparecerão aqui. Você pode editar ou
            excluir qualquer transação clicando nos ícones à direita.
          </p>
        </div>
      ),
      placement: "top",
      disableBeacon: true,
    },
    {
      target: "body",
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">
            Dica: Gerencie suas Categorias 📂
          </h3>
          <p className="text-sm opacity-80 mb-3">
            Você pode personalizar suas categorias de despesas clicando no menu de categorias. Crie categorias que façam sentido para suas finanças!
          </p>
          <ul className="text-sm opacity-80 space-y-1 list-disc list-inside">
            <li>✏️ Adicionar novas categorias</li>
            <li>🎨 Alterar cores e ícones</li>
            <li>🗑️ Remover categorias não usadas</li>
            <li>📊 Ver gastos por categoria</li>
          </ul>
        </div>
      ),
      placement: "center",
      disableBeacon: true,
    },
    {
      target: "body",
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">
            Recursos Adicionais 🚀
          </h3>
          <p className="text-sm opacity-80 mb-3">
            O Organiza oferece muitos outros recursos para ajudar na sua gestão financeira:
          </p>
          <ul className="text-sm opacity-80 space-y-1 list-disc list-inside">
            <li>📊 Relatórios detalhados e análises</li>
            <li>🎯 Metas financeiras para alcançar</li>
            <li>💵 Orçamento mensal com alertas</li>
            <li>📈 Rastreamento de investimentos</li>
            <li>📋 Tarefas recorrentes e calendário</li>
          </ul>
        </div>
      ),
      placement: "center",
      disableBeacon: true,
    },
    {
      target: "body",
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">
            Pronto! Você está preparado! ✨
          </h3>
          <p className="text-sm opacity-80 mb-3">
            Você aprendeu o básico e já pode começar a usar o Organiza. Aqui está um resumo do que você fez:
          </p>
          <ul className="text-sm opacity-80 space-y-1 list-disc list-inside">
            <li>✅ Adicionou sua primeira transação</li>
            <li>✅ Aprendeu sobre categorias</li>
            <li>✅ Descobriu recursos adicionais</li>
          </ul>
          <p className="text-xs opacity-60 mt-3">
            💡 Dica: Você pode rever este tutorial a qualquer momento no seu Perfil.
          </p>
        </div>
      ),
      placement: "center",
      disableBeacon: true,
    },
  ];
}

function getTasksSteps(): Step[] {
  return [
    {
      target: "body",
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">
            Tutorial de Tarefas 📋
          </h3>
          <p className="text-sm opacity-80">
            Aprenda a criar tarefas, agendar lembretes recorrentes e visualizar
            tudo no calendário. Vamos começar!
          </p>
        </div>
      ),
      placement: "center",
      disableBeacon: true,
    },
    {
      target: '[data-tutorial="tasks-new-button"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Criar Nova Tarefa ➕</h3>
          <p className="text-sm opacity-80">
            Clique aqui para criar uma nova tarefa. Você pode criar lembretes
            de pagamento, alertas de orçamento e muito mais!
          </p>
        </div>
      ),
      placement: "bottom",
      disableBeacon: true,
      spotlightClicks: true,
      disableScrolling: true,
    },
    {
      target: '[data-tutorial="task-title"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Título da Tarefa ✏️</h3>
          <p className="text-sm opacity-80">
            Digite um título para sua tarefa. Por exemplo: "Pagar conta de luz",
            "Receber aluguel", etc.
          </p>
        </div>
      ),
      placement: "bottom",
      disableBeacon: true,
      spotlightClicks: true,
      disableScrolling: true,
    },
    {
      target: '[data-tutorial="task-type"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Tipo de Tarefa 🏷️</h3>
          <p className="text-sm opacity-80">
            Escolha o tipo: lembrete de pagamento, alerta de orçamento, lembrete
            de receita ou personalizado.
          </p>
        </div>
      ),
      placement: "bottom",
      disableBeacon: true,
      spotlightClicks: true,
      disableScrolling: true,
      spotlightPadding: 150,
    },
    {
      target: '[data-tutorial="task-date"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Data da Tarefa 📅</h3>
          <p className="text-sm opacity-80">
            Selecione quando você quer ser lembrado desta tarefa.
          </p>
        </div>
      ),
      placement: "bottom",
      disableBeacon: true,
      spotlightClicks: true,
      disableScrolling: true,
    },
    {
      target: '[data-tutorial="task-value"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Valor da Tarefa 💰</h3>
          <p className="text-sm opacity-80">
            Digite o valor associado à tarefa (opcional). Útil para lembretes de
            pagamento ou receita.
          </p>
        </div>
      ),
      placement: "bottom",
      disableBeacon: true,
      spotlightClicks: true,
      disableScrolling: true,
    },
    {
      target: '[data-tutorial="task-category"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Categoria 📂</h3>
          <p className="text-sm opacity-80">
            Escolha uma categoria para organizar suas tarefas (opcional).
          </p>
        </div>
      ),
      placement: "bottom",
      disableBeacon: true,
      spotlightClicks: true,
      disableScrolling: true,
    },
    {
      target: '[data-tutorial="task-recurring"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Tarefa Recorrente 🔄</h3>
          <p className="text-sm opacity-80">
            Ative esta opção para agendar lembretes que se repetem diariamente,
            semanalmente, mensalmente ou anualmente.
          </p>
        </div>
      ),
      placement: "bottom",
      disableBeacon: true,
      spotlightClicks: true,
      disableScrolling: true,
    },
    {
      target: '[data-tutorial="task-submit"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Salvar Tarefa ✅</h3>
          <p className="text-sm opacity-80">
            Clique aqui para salvar sua tarefa. Você receberá notificações
            quando chegar a data agendada!
          </p>
        </div>
      ),
      placement: "top",
      disableBeacon: true,
      spotlightClicks: true,
      disableScrolling: false,
      scrollOffset: 100,
    },
    {
      target: '[data-tutorial="tasks-search"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Buscar Tarefas 🔍</h3>
          <p className="text-sm opacity-80">
            Use o campo de busca para encontrar tarefas rapidamente pelo nome,
            descrição ou categoria.
          </p>
        </div>
      ),
      placement: "bottom",
      disableBeacon: true,
    },
    {
      target: '[data-tutorial="tasks-period-filter"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Filtrar por Período 📅</h3>
          <p className="text-sm opacity-80">
            Filtre suas tarefas por período: mês atual, próximo mês ou um
            período personalizado.
          </p>
        </div>
      ),
      placement: "bottom",
      disableBeacon: true,
      spotlightClicks: true,
      disableScrolling: true,
    },
    {
      target: '[data-tutorial="tasks-calendar-button"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Ver no Calendário 🗓️</h3>
          <p className="text-sm opacity-80">
            Clique aqui para visualizar suas tarefas no formato de calendário.
            Dias com tarefas terão um indicador visual.
          </p>
        </div>
      ),
      placement: "bottom",
      disableBeacon: true,
      spotlightClicks: true,
      disableScrolling: true,
    },
    {
      target: "body",
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Visualização no Calendário 📆</h3>
          <p className="text-sm opacity-80 mb-3">
            A página de calendário mostra todas as suas tarefas organizadas por data:
          </p>
          <ul className="text-sm opacity-80 space-y-1 list-disc list-inside">
            <li>📅 Visualize tarefas agendadas em cada dia</li>
            <li>🔵 Indicadores visuais nos dias com tarefas</li>
            <li>✏️ Clique em uma tarefa para editar ou marcar como concluída</li>
            <li>🗓️ Navegue entre meses facilmente</li>
            <li>🔄 Tarefas recorrentes aparecem em todas as datas</li>
          </ul>
          <p className="text-sm opacity-80 mt-3">
            É uma forma visual de gerenciar seus compromissos financeiros!
          </p>
        </div>
      ),
      placement: "center",
      disableBeacon: true,
    },
    {
      target: '[data-tutorial="tasks-list"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Lista de Tarefas 📝</h3>
          <p className="text-sm opacity-80">
            Aqui aparecem todas as suas tarefas. Você pode:
          </p>
          <ul className="text-sm opacity-80 space-y-1 list-disc list-inside mt-2">
            <li>✅ Marcar como concluída</li>
            <li>✏️ Editar a tarefa</li>
            <li>🗑️ Excluir a tarefa</li>
            <li>📅 Sincronizar com Google Calendar</li>
          </ul>
        </div>
      ),
      placement: "top",
      disableBeacon: true,
      spotlightClicks: true,
      spotlightPadding: 20,
    },
    {
      target: "body",
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">
            Dica: Tarefas Recorrentes 🔄
          </h3>
          <p className="text-sm opacity-80 mb-3">
            Ao criar uma nova tarefa, ative a opção <strong>"Tarefa Recorrente"</strong> para
            agendar lembretes automáticos que se repetem:
          </p>
          <ul className="text-sm opacity-80 space-y-1 list-disc list-inside">
            <li>📆 Diariamente</li>
            <li>📅 Semanalmente</li>
            <li>🗓️ Mensalmente (ideal para contas)</li>
            <li>📊 Anualmente</li>
          </ul>
          <p className="text-sm opacity-80 mt-3">
            Quando concluir uma tarefa recorrente, a próxima ocorrência é criada
            automaticamente!
          </p>
        </div>
      ),
      placement: "center",
      disableBeacon: true,
    },
    {
      target: "body",
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">
            Tutorial Concluído! 🎉
          </h3>
          <p className="text-sm opacity-80 mb-3">
            Agora você sabe como gerenciar suas tarefas! Resumo:
          </p>
          <ul className="text-sm opacity-80 space-y-1 list-disc list-inside">
            <li>Crie tarefas com valor e categoria</li>
            <li>Configure recorrência para contas fixas</li>
            <li>Visualize no calendário</li>
            <li>Receba notificações por email e push</li>
            <li>Sincronize com Google Calendar</li>
          </ul>
          <p className="text-xs opacity-60 mt-3">
            💡 Você pode rever este tutorial a qualquer momento no seu Perfil.
          </p>
        </div>
      ),
      placement: "center",
      disableBeacon: true,
    },
  ];
}

export function Tutorial({ type = "main", onComplete }: TutorialProps) {
  const { showTutorial, completeTutorial } = useTutorial(type);
  const [stepIndex, setStepIndex] = useState(0);

  const steps = type === "main" ? getMainSteps() : getTasksSteps();

  useEffect(() => {
    // Auto-advance when target element appears
    const currentStep = steps[stepIndex];
    if (!currentStep || !currentStep.target || currentStep.target === "body") return;

    const selector = String(currentStep.target);
    const observer = new MutationObserver(() => {
      if (document.querySelector(selector)) {
        // Element is now visible, the tutorial will auto-focus
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    return () => observer.disconnect();
  }, [stepIndex, steps]);

  // Handle spotlight button clicks - Step 2: Add transaction button or tasks new button
  useEffect(() => {
    if (stepIndex !== 1) return; // Only on step 2

    const handleSpotlightClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const addTransactionBtn = document.querySelector('[data-tutorial="add-transaction-button"]');
      const tasksNewBtn = document.querySelector('[data-tutorial="tasks-new-button"]');
      
      if (addTransactionBtn && addTransactionBtn.contains(target)) {
        // Wait for form to open, then advance
        setTimeout(() => {
          setStepIndex(2);
        }, 300);
      } else if (tasksNewBtn && tasksNewBtn.contains(target)) {
        // Click the button to open the form
        (tasksNewBtn as HTMLElement).click();
        // Wait for form to open, then advance
        setTimeout(() => {
          setStepIndex(2);
        }, 300);
      }
    };

    // Auto-click for tasks when step 2 is reached
    if (type === "tasks") {
      const tasksNewBtn = document.querySelector('[data-tutorial="tasks-new-button"]');
      if (tasksNewBtn) {
        setTimeout(() => {
          (tasksNewBtn as HTMLElement).click();
          setTimeout(() => {
            setStepIndex(2);
          }, 300);
        }, 500);
      }
    }

    document.addEventListener("click", handleSpotlightClick, true);
    return () => document.removeEventListener("click", handleSpotlightClick, true);
  }, [stepIndex, type]);

  // Prevent dialog from closing during tutorial for Tasks
  // Note: previous code referenced a non-existent `run` variable.
  useEffect(() => {
    if (type !== "tasks" || !showTutorial) return;
    if (stepIndex < 2 || stepIndex > 8) return; // Steps 3-9 (indexes 2-8) are inside the form

    const handleFocusOut = (e: FocusEvent) => {
      // Keep focus inside the dialog while the tutorial is guiding form steps.
      e.preventDefault();
      e.stopPropagation();
    };

    const dialogElement = document.querySelector('[role="dialog"]');
    if (dialogElement) {
      dialogElement.addEventListener("focusout", handleFocusOut, true);
    }

    return () => {
      if (dialogElement) {
        dialogElement.removeEventListener("focusout", handleFocusOut, true);
      }
    };
  }, [stepIndex, showTutorial, type]);

  // Handle transaction type selection - Step 3: Auto-advance when type is selected
  useEffect(() => {
    if (stepIndex !== 2) return; // Only on step 3 (transaction type)

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const typeContainer = document.querySelector('[data-tutorial="transaction-type"]');
      
      // Check if click was inside the transaction type selector (on one of the buttons)
      if (typeContainer && typeContainer.contains(target)) {
        const clickedButton = target.closest("button");
        if (clickedButton) {
          // Wait for selection to complete, then advance
          setTimeout(() => {
            setStepIndex(3);
          }, 400);
        }
      }
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [stepIndex]);

  // Handle amount input - Step 4: Auto-advance when user types a value and presses Enter
  useEffect(() => {
    if (stepIndex !== 3) return; // Only on step 4 (transaction amount)

    const handleAmountKeydown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const amountInput = document.querySelector('[data-tutorial="transaction-amount"]');
      
      if (amountInput && (amountInput === target || amountInput.contains(target))) {
        if (e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();
          setTimeout(() => {
            setStepIndex(4);
          }, 300);
        }
      }
    };

    document.addEventListener("keydown", handleAmountKeydown, true);
    return () => {
      document.removeEventListener("keydown", handleAmountKeydown, true);
    };
  }, [stepIndex]);

  // Handle category selection - Step 5: Auto-advance when category is selected
  useEffect(() => {
    if (stepIndex !== 4) return; // Only on step 5 (transaction category)

    const handleCategoryButtonClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Check if click was on a SelectItem
      if (target.closest('[role="option"]')) {
        setTimeout(() => {
          setStepIndex(5);
        }, 400);
      }
    };

    document.addEventListener("click", handleCategoryButtonClick, true);
    return () => document.removeEventListener("click", handleCategoryButtonClick, true);
  }, [stepIndex]);

  // Handle transaction submit - Step 8: Auto-advance to step 9 when form is submitted
  useEffect(() => {
    if (stepIndex !== 7) return; // Only on step 8 (submit transaction/task)

    const handleFormSubmit = (e: Event) => {
      const target = e.target as HTMLElement;
      const submitButton = document.querySelector('[data-tutorial="submit-transaction"]');
      const taskSubmitButton = document.querySelector('[data-tutorial="task-submit"]');
      
      if (submitButton && (submitButton === target || submitButton.contains(target))) {
        setTimeout(() => {
          setStepIndex(8);
        }, 500);
      } else if (taskSubmitButton && (taskSubmitButton === target || taskSubmitButton.contains(target))) {
        // For tasks, close the dialog and move focus out
        setTimeout(() => {
          const dialogOverlay = document.querySelector('[data-radix-dialog-overlay]');
          if (dialogOverlay) {
            // Click outside the dialog to close it
            (dialogOverlay as HTMLElement).click();
          }
          // Move to next step after closing
          setTimeout(() => {
            setStepIndex(8);
          }, 400);
        }, 300);
      }
    };

    document.addEventListener("click", handleFormSubmit, true);
    return () => document.removeEventListener("click", handleFormSubmit, true);
  }, [stepIndex, type]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, type: callbackType, index } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      completeTutorial();
      onComplete?.();
    }

    // Update step index when step changes
    if (callbackType === "step:after") {
      setStepIndex(index + 1);
    }
  };

  if (!showTutorial) return null;

  return (
    <>
      <style>{`
        .react-joyride__overlay {
          z-index: 9999 !important;
        }
        .react-joyride__spotlight {
          z-index: 9999 !important;
        }
        .__floater {
          z-index: 10001 !important;
        }
        .__floater__body {
          z-index: 10001 !important;
        }
      `}</style>
      <Joyride
        steps={steps}
        continuous
        showProgress
        showSkipButton
        scrollToFirstStep
        disableOverlayClose
        hideBackButton={false}
        stepIndex={stepIndex}
        callback={handleJoyrideCallback}
        locale={locale}
        styles={tooltipStyles}
        floaterProps={{
          styles: {
            floater: {
              zIndex: 10001,
            },
          },
          disableAnimation: true,
        }}
      />
    </>
  );
}
