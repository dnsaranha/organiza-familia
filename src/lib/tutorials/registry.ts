import type { Step } from "react-joyride";

export interface TutorialDefinition {
  id: string;
  title: string;
  description: string;
  /** If set, when the user visits this route for the first time we prompt to start. */
  autoPromptOnRoute?: string | string[];
  /** Route where the tutorial makes sense. If provided, starting from the menu will
   *  navigate here first when the user is elsewhere. */
  startRoute?: string;
  steps: Step[];
}

/**
 * Registry of guided tutorials. Add new tutorials here and the rest of the
 * system (menu shortcut, first-visit prompt, storage flags) picks them up
 * automatically. Each step targets a CSS selector — anchor UI elements with
 * `data-tutorial="<id>"` and reference them as `[data-tutorial="<id>"]`.
 */
export const tutorials: TutorialDefinition[] = [
  {
    id: "add-transaction",
    title: "Adicionar uma transação",
    description:
      "Aprenda passo a passo como registrar uma nova receita ou despesa.",
    autoPromptOnRoute: ["/dashboard"],
    startRoute: "/dashboard",
    steps: [
      {
        target: '[data-tutorial="tx-open"]',
        title: "Nova transação",
        content:
          "Clique neste botão para abrir o formulário e registrar uma nova transação.",
        placement: "auto",
        skipBeacon: true,
      },
      {
        target: '[data-tutorial="tx-amount"]',
        title: "Valor",
        content: "Informe o valor da transação. Use o teclado numérico.",
        placement: "bottom",
        skipBeacon: true,
      },
      {
        target: '[data-tutorial="tx-category"]',
        title: "Categoria",
        content:
          "Escolha a categoria correspondente. Isso ajuda nos relatórios e no orçamento.",
        placement: "bottom",
        skipBeacon: true,
      },
      {
        target: '[data-tutorial="tx-date"]',
        title: "Data",
        content: "Selecione a data em que a transação aconteceu.",
        placement: "bottom",
        skipBeacon: true,
      },
      {
        target: '[data-tutorial="tx-description"]',
        title: "Descrição (opcional)",
        content: "Adicione uma descrição para lembrar o motivo da transação.",
        placement: "top",
        skipBeacon: true,
      },
      {
        target: '[data-tutorial="tx-submit"]',
        title: "Salvar",
        content:
          "Confirme para adicionar a transação. Pronto — ela aparecerá na sua lista e no resumo financeiro!",
        placement: "top",
        skipBeacon: true,
      },
    ],
  },
  {
    id: "edit-transaction",
    title: "Editar ou excluir uma transação",
    description:
      "Aprenda como alterar ou remover uma transação já registrada pelo histórico.",
    startRoute: "/dashboard",
    steps: [
      {
        target: '[data-tutorial="tx-history-item"]',
        title: "Histórico de Transações",
        content:
          "Cada linha do histórico representa uma transação registrada. Vamos abrir o menu de ações da primeira.",
        placement: "auto",
        skipBeacon: true,
      },
      {
        target: '[data-tutorial="tx-history-menu"]',
        title: "Menu de ações",
        content:
          "Toque neste ícone (⋯) para abrir as opções da transação. Vamos abrir para você.",
        placement: "left",
        skipBeacon: true,
      },
      {
        target: '[data-tutorial="tx-history-edit"]',
        title: "Editar",
        content:
          "Selecione Editar para alterar valor, categoria, data ou descrição da transação.",
        placement: "left",
        skipBeacon: true,
      },
      {
        target: '[data-tutorial="tx-history-delete"]',
        title: "Excluir",
        content:
          "A opção Excluir remove a transação permanentemente. Um alerta pedirá confirmação antes de apagar.",
        placement: "left",
        skipBeacon: true,
      },
      {
        target: '[data-tutorial="tx-submit"]',
        title: "Salvar alterações",
        content:
          "Após ajustar os campos, clique em Salvar para confirmar a edição. Pronto!",
        placement: "top",
        skipBeacon: true,
      },
    ],
  },
  {
    id: "add-task",
    title: "Adicionar e gerenciar tarefas",
    description:
      "Aprenda a agendar tarefas, ver a lista e o calendário, e usar as ações de concluir, editar, excluir e integrar com o Google Calendar.",
    startRoute: "/tasks",
    steps: [
      {
        target: '[data-tutorial="task-new"]',
        title: "Nova tarefa",
        content:
          "Clique aqui para abrir o formulário e agendar uma nova tarefa. Vamos abrir para você.",
        placement: "auto",
        skipBeacon: true,
      },
      {
        target: '[data-tutorial="task-form-title"]',
        title: "Título",
        content:
          "Dê um nome curto e claro à tarefa. Ex.: \"Pagar conta de luz\".",
        placement: "bottom",
        skipBeacon: true,
      },
      {
        target: '[data-tutorial="task-form-date"]',
        title: "Data e horário",
        content:
          "Escolha quando a tarefa deve acontecer. O horário é usado para lembretes e para a integração com o Google Calendar.",
        placement: "bottom",
        skipBeacon: true,
      },
      {
        target: '[data-tutorial="task-form-category"]',
        title: "Valor e categoria",
        content:
          "Se a tarefa envolver dinheiro (uma conta a pagar ou receber), informe o valor e a categoria para aparecer no orçamento.",
        placement: "top",
        skipBeacon: true,
      },
      {
        target: '[data-tutorial="task-form-submit"]',
        title: "Salvar",
        content:
          "Confirme para agendar a tarefa. Vamos fechar o formulário agora e mostrar como gerenciá-la.",
        placement: "top",
        skipBeacon: true,
      },
      {
        target: '[data-tutorial="task-list"]',
        title: "Ações de cada tarefa",
        content:
          "Cada cartão da lista traz, à direita: concluir (ou reativar, se já concluída), editar, excluir e — se sua conta Google estiver conectada — enviar/abrir a tarefa no Google Calendar.",
        placement: "top",
        skipBeacon: true,
      },
      {
        target: '[data-tutorial="task-calendar-link"]',
        title: "Visão de calendário",
        content:
          "Aqui você alterna para o calendário mensal. Vamos abrir a visão de calendário.",
        placement: "bottom",
        skipBeacon: true,
      },
      {
        target: '[data-tutorial="task-calendar-grid"]',
        title: "Calendário",
        content:
          "Os dias com tarefas ficam marcados com um ponto. Toque em um dia para ver as tarefas daquela data ao lado.",
        placement: "auto",
        skipBeacon: true,
      },
      {
        target: '[data-tutorial="task-list-link"]',
        title: "Voltar para a lista",
        content:
          "Use este botão para voltar à lista de tarefas quando quiser. Pronto — você já sabe agendar e gerenciar tarefas!",
        placement: "bottom",
        skipBeacon: true,
      },
    ],
  },
];

export const getTutorial = (id: string) =>
  tutorials.find((t) => t.id === id);