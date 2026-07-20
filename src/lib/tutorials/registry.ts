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
  {
    id: "profile",
    title: "Perfil e preferências",
    description:
      "Configure seus dados, avatar, dia de início do mês, tema, categorias e o menu inferior do mobile.",
    startRoute: "/profile",
    steps: [
      {
        target: '[data-tutorial="profile-fullname"]',
        title: "Nome completo",
        content:
          "Atualize o nome exibido no app e em grupos compartilhados.",
        placement: "bottom",
        skipBeacon: true,
      },
      {
        target: '[data-tutorial="profile-avatar"]',
        title: "Avatar",
        content:
          "Envie uma foto de perfil para identificar sua conta.",
        placement: "bottom",
        skipBeacon: true,
      },
      {
        target: '[data-tutorial="profile-month-start"]',
        title: "Dia de início do mês",
        content:
          "Escolha o dia em que seu mês financeiro começa (ex.: 1, 5, 10). Todos os relatórios e o orçamento seguem este ciclo.",
        placement: "bottom",
        skipBeacon: true,
      },
      {
        target: '[data-tutorial="profile-carryover"]',
        title: "Transportar saldo",
        content:
          "Ative para começar cada mês com o saldo final do mês anterior.",
        placement: "top",
        skipBeacon: true,
      },
      {
        target: '[data-tutorial="profile-darkmode"]',
        title: "Modo escuro",
        content: "Alterne entre o tema claro e escuro conforme sua preferência.",
        placement: "top",
        skipBeacon: true,
      },
      {
        target: '[data-tutorial="profile-categories"]',
        title: "Categorias personalizadas",
        content:
          "Crie, edite e escolha ícones/cores para categorias de transações e tarefas.",
        placement: "top",
        skipBeacon: true,
      },
      {
        target: '[data-tutorial="profile-bottomnav"]',
        title: "Menu inferior (mobile)",
        content:
          "Escolha quais atalhos aparecem no menu inferior do app no celular.",
        placement: "top",
        skipBeacon: true,
      },
      {
        target: '[data-tutorial="profile-save"]',
        title: "Salvar alterações",
        content: "Confirme para gravar todas as mudanças do perfil.",
        placement: "top",
        skipBeacon: true,
      },
      {
        target: '[data-tutorial="profile-danger"]',
        title: "Zona de perigo",
        content:
          "Aqui você pode limpar todos os dados ou solicitar a exclusão permanente da conta. Use com cautela — a ação não pode ser desfeita.",
        placement: "top",
        skipBeacon: true,
      },
    ],
  },
  {
    id: "reports",
    title: "Relatórios avançados",
    description:
      "Filtre por período, categoria e membro, exporte em PDF/Excel e navegue entre transações manuais e bancárias.",
    startRoute: "/reports",
    steps: [
      {
        target: '[data-tutorial="reports-filters"]',
        title: "Filtros",
        content:
          "Ajuste o período, a categoria e (em grupos) o membro. Todos os gráficos e listas abaixo são recalculados.",
        placement: "bottom",
        skipBeacon: true,
      },
      {
        target: '[data-tutorial="reports-pdf"]',
        title: "Exportar PDF",
        content:
          "Gera um relatório em PDF com os gráficos e o histórico do período filtrado.",
        placement: "bottom",
        skipBeacon: true,
      },
      {
        target: '[data-tutorial="reports-excel"]',
        title: "Exportar Excel",
        content:
          "Baixa a mesma base em planilha para análises externas.",
        placement: "bottom",
        skipBeacon: true,
      },
      {
        target: '[data-tutorial="reports-tabs"]',
        title: "Manuais x Bancárias",
        content:
          "Alterne entre transações manuais e as importadas do Open Finance (quando conectado).",
        placement: "bottom",
        skipBeacon: true,
      },
      {
        target: '[data-tutorial="reports-history"]',
        title: "Histórico de transações",
        content:
          "Lista detalhada respeitando os filtros. Pronto — os relatórios estão sob seu controle!",
        placement: "top",
        skipBeacon: true,
      },
    ],
  },
  {
    id: "goals",
    title: "Metas de reserva",
    description:
      "Aprenda a criar metas, acompanhar o progresso, adicionar valores e editar/excluir metas existentes.",
    startRoute: "/goals",
    steps: [
      {
        target: '[data-tutorial="goal-new"]',
        title: "Nova meta",
        content:
          "Clique aqui para criar uma meta. Defina título, valor-alvo, prazo, contribuição mensal, ícone e cor.",
        placement: "bottom",
        skipBeacon: true,
      },
      {
        target: '[data-tutorial="goal-card"]',
        title: "Cartão da meta",
        content:
          "Cada meta aparece em um cartão colorido com todas as informações principais.",
        placement: "auto",
        skipBeacon: true,
      },
      {
        target: '[data-tutorial="goal-progress"]',
        title: "Progresso",
        content:
          "A barra mostra quanto já foi acumulado e quanto ainda falta para atingir o alvo.",
        placement: "top",
        skipBeacon: true,
      },
      {
        target: '[data-tutorial="goal-actions"]',
        title: "Expandir, editar e excluir",
        content:
          "Use estes ícones para ver o histórico de contribuições, editar os dados ou remover a meta.",
        placement: "left",
        skipBeacon: true,
      },
      {
        target: '[data-tutorial="goal-add-value"]',
        title: "Adicionar valor",
        content:
          "Registre aportes manuais na meta. Cada valor é somado ao acumulado atual.",
        placement: "top",
        skipBeacon: true,
      },
    ],
  },
  {
    id: "budget",
    title: "Orçamento mensal",
    description:
      "Entenda os cartões de resumo, distribua o orçamento por categoria e salve suas configurações.",
    startRoute: "/budget",
    steps: [
      {
        target: '[data-tutorial="budget-summary"]',
        title: "Resumo do mês",
        content:
          "Receita, gastos, saldo restante e o percentual usado do orçamento — tudo do mês atual.",
        placement: "bottom",
        skipBeacon: true,
      },
      {
        target: '[data-tutorial="budget-income"]',
        title: "Renda mensal base",
        content:
          "Informe a renda-base usada para calcular quanto cada categoria representa em reais.",
        placement: "bottom",
        skipBeacon: true,
      },
      {
        target: '[data-tutorial="budget-chart"]',
        title: "Distribuição",
        content:
          "O gráfico de pizza mostra a divisão atual. A soma precisa ser 100%.",
        placement: "right",
        skipBeacon: true,
      },
      {
        target: '[data-tutorial="budget-sliders"]',
        title: "Ajuste por categoria",
        content:
          "Arraste os sliders para definir a porcentagem de cada categoria. O botão de engrenagem permite mapear categorias de transação a cada grupo.",
        placement: "top",
        skipBeacon: true,
      },
      {
        target: '[data-tutorial="budget-save"]',
        title: "Salvar",
        content:
          "Confirme para gravar sua distribuição. O botão fica ativo quando o total é 100%.",
        placement: "top",
        skipBeacon: true,
      },
    ],
  },
  {
    id: "forecast",
    title: "Previsão financeira",
    description:
      "Projete receitas e despesas para os próximos meses combinando tarefas agendadas e médias históricas.",
    startRoute: "/forecast",
    steps: [
      {
        target: '[data-tutorial="forecast-period"]',
        title: "Período da projeção",
        content:
          "Escolha quantos meses à frente deseja projetar (3, 6 ou 12).",
        placement: "bottom",
        skipBeacon: true,
      },
      {
        target: '[data-tutorial="forecast-totals"]',
        title: "Totais previstos",
        content:
          "Somatório de receitas, despesas e o saldo final projetado para o período.",
        placement: "bottom",
        skipBeacon: true,
      },
      {
        target: '[data-tutorial="forecast-chart"]',
        title: "Projeção mensal",
        content:
          "Compare visualmente receitas e despesas previstas mês a mês.",
        placement: "top",
        skipBeacon: true,
      },
      {
        target: '[data-tutorial="forecast-details"]',
        title: "Detalhes por mês",
        content:
          "Cada cartão mostra receitas, despesas, saldo do mês e o acumulado, além dos agendamentos que compõem a previsão.",
        placement: "top",
        skipBeacon: true,
      },
    ],
  },
];

export const getTutorial = (id: string) =>
  tutorials.find((t) => t.id === id);