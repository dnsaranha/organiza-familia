import Joyride, { CallBackProps, STATUS, Step } from "react-joyride";
import { useTutorial } from "@/hooks/useTutorial";

interface TutorialProps {
  onComplete?: () => void;
}

export function Tutorial({ onComplete }: TutorialProps) {
  const { showTutorial, completeTutorial } = useTutorial();

  const steps: Step[] = [
    {
      target: "body",
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">
            Bem-vindo ao Organiza! 🎉
          </h3>
          <p className="text-sm text-muted-foreground">
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
          <h3 className="text-lg font-semibold mb-2">Adicionar Transação</h3>
          <p className="text-sm text-muted-foreground">
            Clique aqui para adicionar uma nova receita ou despesa. Vamos
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
          <p className="text-sm text-muted-foreground">
            Escolha se é uma <strong>Receita</strong> (dinheiro que entra) ou{" "}
            <strong>Despesa</strong> (dinheiro que sai). Vamos escolher Receita
            primeiro.
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
          <h3 className="text-lg font-semibold mb-2">Descrição</h3>
          <p className="text-sm text-muted-foreground">
            Digite uma descrição para sua transação. Por exemplo: "Salário",
            "Freelance", etc.
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
          <h3 className="text-lg font-semibold mb-2">Valor</h3>
          <p className="text-sm text-muted-foreground">
            Digite o valor da transação. O sistema já formata automaticamente
            como moeda.
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
          <h3 className="text-lg font-semibold mb-2">Categoria</h3>
          <p className="text-sm text-muted-foreground">
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
          <h3 className="text-lg font-semibold mb-2">Data</h3>
          <p className="text-sm text-muted-foreground">
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
      target: '[data-tutorial="submit-transaction"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Salvar Transação</h3>
          <p className="text-sm text-muted-foreground">
            Clique aqui para salvar sua transação. Após adicionar uma receita,
            vamos adicionar uma despesa também!
          </p>
        </div>
      ),
      placement: "top",
      disableBeacon: true,
    },
    {
      target: '[data-tutorial="transaction-list"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">
            Lista de Transações 📊
          </h3>
          <p className="text-sm text-muted-foreground">
            Todas as suas transações aparecerão aqui. Você pode editar ou
            excluir qualquer transação clicando nos ícones à direita.
          </p>
        </div>
      ),
      placement: "top",
      disableBeacon: true,
    },
    {
      target: '[data-tutorial="clear-data"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Limpar Dados</h3>
          <p className="text-sm text-muted-foreground">
            Se precisar recomeçar, você pode limpar todas as transações do mês
            atual usando este botão. Use com cuidado! ⚠️
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
          <p className="text-sm text-muted-foreground mb-3">
            Agora você sabe como adicionar receitas e despesas. Explore os
            outros recursos do app:
          </p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Relatórios detalhados</li>
            <li>Metas financeiras</li>
            <li>Orçamento mensal</li>
            <li>Investimentos</li>
          </ul>
        </div>
      ),
      placement: "center",
      disableBeacon: true,
    },
  ];

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
      callback={handleJoyrideCallback}
      locale={{
        back: "Voltar",
        close: "Fechar",
        last: "Finalizar",
        next: "Próximo",
        skip: "Pular",
      }}
      styles={{
        options: {
          primaryColor: "hsl(var(--primary))",
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: "8px",
          padding: "20px",
        },
        buttonNext: {
          backgroundColor: "hsl(var(--primary))",
          borderRadius: "6px",
          padding: "8px 16px",
        },
        buttonBack: {
          marginRight: "10px",
          color: "hsl(var(--muted-foreground))",
        },
        buttonSkip: {
          color: "hsl(var(--muted-foreground))",
        },
      }}
    />
  );
}
