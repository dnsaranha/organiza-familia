import type { Step } from "react-joyride";

export interface TutorialDefinition {
  id: string;
  title: string;
  description: string;
  /** If set, when the user visits this route for the first time we prompt to start. */
  autoPromptOnRoute?: string | string[];
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
    autoPromptOnRoute: ["/dashboard", "/"],
    steps: [
      {
        target: '[data-tutorial="tx-open"]',
        title: "Nova transação",
        content:
          "Clique neste botão para abrir o formulário e registrar uma nova transação.",
        disableBeacon: true,
        spotlightClicks: true,
        placement: "auto",
      },
      {
        target: '[data-tutorial="tx-amount"]',
        title: "Valor",
        content: "Informe o valor da transação. Use o teclado numérico.",
        placement: "bottom",
      },
      {
        target: '[data-tutorial="tx-category"]',
        title: "Categoria",
        content:
          "Escolha a categoria correspondente. Isso ajuda nos relatórios e no orçamento.",
        placement: "bottom",
      },
      {
        target: '[data-tutorial="tx-date"]',
        title: "Data",
        content: "Selecione a data em que a transação aconteceu.",
        placement: "bottom",
      },
      {
        target: '[data-tutorial="tx-description"]',
        title: "Descrição (opcional)",
        content: "Adicione uma descrição para lembrar o motivo da transação.",
        placement: "top",
      },
      {
        target: '[data-tutorial="tx-submit"]',
        title: "Salvar",
        content:
          "Confirme para adicionar a transação. Pronto — ela aparecerá na sua lista e no resumo financeiro!",
        placement: "top",
      },
    ],
  },
];

export const getTutorial = (id: string) =>
  tutorials.find((t) => t.id === id);