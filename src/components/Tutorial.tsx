import Joyride, { CallBackProps, STATUS, Step } from "react-joyride";
import { useTutorial, TutorialType } from "@/hooks/useTutorial";

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
            Clique neste botão para adicionar uma nova receita ou despesa. Vamos
            começar adicionando uma receita!
          </p>
        </div>
      ),
      placement: "top",
      disableBeacon: true,
      spotlightClicks: true,
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
      placement: "bottom",
      disableBeacon: true,
      spotlightClicks: true,
    },
    {
      target: '[data-tutorial="transaction-amount"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Valor 💰</h3>
          <p className="text-sm opacity-80">
            Digite o valor da transação. O sistema já formata automaticamente
            como moeda.
          </p>
        </div>
      ),
      placement: "bottom",
      disableBeacon: true,
      spotlightClicks: true,
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
      spotlightClicks: true,
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
            Clique aqui para criar uma nova tarefa. Você pode criar lembretes
            de pagamento, alertas de orçamento e muito mais!
          </p>
        </div>
      ),
      placement: "bottom",
      disableBeacon: true,
      spotlightClicks: true,
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

  const steps = type === "main" ? getMainSteps() : getTasksSteps();

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      completeTutorial();
      onComplete?.();
    }
  };

  if (!showTutorial) return null;

  return (
    <Joyride
      steps={steps}
      continuous
      showProgress
      showSkipButton
      scrollToFirstStep
      disableOverlayClose
      callback={handleJoyrideCallback}
      locale={locale}
      styles={tooltipStyles}
    />
  );
}
