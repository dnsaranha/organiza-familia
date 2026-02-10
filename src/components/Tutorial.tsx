import Joyride, { CallBackProps, STATUS, Step, ACTIONS, EVENTS } from "react-joyride";
import { useTutorial, TutorialType } from "@/hooks/useTutorial";
import { useState, useEffect, useCallback } from "react";

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
            Clique neste botão para abrir o formulário de nova transação. 
            <strong className="block mt-2 text-primary">👆 Clique no botão para continuar!</strong>
          </p>
        </div>
      ),
      placement: "top",
      disableBeacon: true,
      spotlightClicks: true,
      hideFooter: true,
    },
    {
      target: '[data-tutorial="transaction-type"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Tipo de Transação 💰</h3>
          <p className="text-sm opacity-80">
            Escolha se é uma <strong>Receita</strong> (dinheiro que entra) ou{" "}
            <strong>Despesa</strong> (dinheiro que sai).
          </p>
        </div>
      ),
      placement: "bottom",
      disableBeacon: true,
    
    },
    {
      target: '[data-tutorial="transaction-amount"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Valor 💵</h3>
          <p className="text-sm opacity-80">
            Digite o valor da transação. O sistema já formata automaticamente
            como moeda brasileira.
          </p>
        </div>
      ),
      placement: "bottom",
      disableBeacon: true,
    
    },
    {
      target: '[data-tutorial="transaction-category"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Categoria 📂</h3>
          <p className="text-sm opacity-80">
            Escolha uma categoria para organizar melhor suas finanças. Isso
            ajuda nos relatórios!
          </p>
        </div>
      ),
      placement: "bottom",
      disableBeacon: true,
    
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
    
    },
    {
      target: '[data-tutorial="transaction-description"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Descrição ✏️</h3>
          <p className="text-sm opacity-80">
            Adicione uma descrição opcional. Ex: "Salário mensal", "Conta de luz", etc.
          </p>
        </div>
      ),
      placement: "bottom",
      disableBeacon: true,
    
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
    
    },
    {
      target: "body",
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">
            Pronto! Você está preparado! ✨
          </h3>
          <p className="text-sm opacity-80 mb-3">
            Agora você sabe como adicionar receitas e despesas. Explore os
            outros recursos do app:
          </p>
          <ul className="text-sm opacity-80 space-y-1 list-disc list-inside">
            <li>📊 Relatórios detalhados</li>
            <li>🎯 Metas financeiras</li>
            <li>💵 Orçamento mensal</li>
            <li>📈 Investimentos</li>
            <li>📋 Tarefas e agenda</li>
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
            Clique aqui para abrir o formulário de nova tarefa.
            <strong className="block mt-2 text-primary">👆 Clique no botão para continuar!</strong>
          </p>
        </div>
      ),
      placement: "bottom",
      disableBeacon: true,
      spotlightClicks: true,
      hideFooter: true,
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
    
    },
    {
      target: '[data-tutorial="task-category"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Categoria 📂</h3>
          <p className="text-sm opacity-80">
            Escolha uma categoria para organizar suas tarefas (obrigatório se houver valor).
          </p>
        </div>
      ),
      placement: "bottom",
      disableBeacon: true,
    
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
  const [run, setRun] = useState(true);

  const steps = type === "main" ? getMainSteps() : getTasksSteps();

  // Monitora se o formulário foi aberto para avançar automaticamente
  useEffect(() => {
    if (!showTutorial || !run) return;

    const checkFormOpen = () => {
      // Para o tutorial principal: verifica se o formulário de transação está aberto
      if (type === "main" && stepIndex === 1) {
        const transactionType = document.querySelector('[data-tutorial="transaction-type"]');
        if (transactionType) {
          setStepIndex(2);
        }
      }
      // Para o tutorial de tarefas: verifica se o formulário de tarefas está aberto
      if (type === "tasks" && stepIndex === 1) {
        const taskTitle = document.querySelector('[data-tutorial="task-title"]');
        if (taskTitle) {
          setStepIndex(2);
        }
      }
    };

    const interval = setInterval(checkFormOpen, 300);
    return () => clearInterval(interval);
  }, [showTutorial, stepIndex, type, run]);

  const handleJoyrideCallback = useCallback((data: CallBackProps) => {
    const { status, action, index, type: eventType } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      completeTutorial();
      setRun(false);
      onComplete?.();
      return;
    }

    // Avança para o próximo passo normalmente
    if (eventType === EVENTS.STEP_AFTER) {
      if (action === ACTIONS.NEXT) {
        setStepIndex(index + 1);
      } else if (action === ACTIONS.PREV) {
        setStepIndex(index - 1);
      }
    }

    // Se o target não foi encontrado, tenta avançar
    if (eventType === EVENTS.TARGET_NOT_FOUND) {
      // Se estamos no passo do botão e o formulário já está aberto, avança
      if (index === 1) {
        const formSelector = type === "main" 
          ? '[data-tutorial="transaction-type"]' 
          : '[data-tutorial="task-title"]';
        if (document.querySelector(formSelector)) {
          setStepIndex(2);
        }
      } else {
        // Tenta avançar para o próximo passo
        setStepIndex(index + 1);
      }
    }
  }, [completeTutorial, onComplete, type]);

  if (!showTutorial) return null;

  return (
    <Joyride
      steps={steps}
      stepIndex={stepIndex}
      run={run}
      continuous
      showProgress
      showSkipButton
      scrollToFirstStep
      disableOverlayClose
      disableScrollParentFix
      hideBackButton={false}
      callback={handleJoyrideCallback}
      locale={locale}
      styles={tooltipStyles}
    />
  );
}
