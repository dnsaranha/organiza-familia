// Budget categories configuration with transaction category mappings
export interface BudgetCategory {
  id: string;
  name: string;
  color: string;
  defaultPercentage: number;
  transactionCategories: string[]; // Transaction categories that map to this budget category
}

// Default budget categories with their transaction category mappings
export const defaultBudgetCategories: BudgetCategory[] = [
  {
    id: "liberdade-financeira",
    name: "Liberdade Financeira",
    color: "hsl(var(--chart-1))",
    defaultPercentage: 25,
    transactionCategories: ["Investimentos", "Poupança", "Reserva"],
  },
  {
    id: "custos-fixos",
    name: "Custos Fixos",
    color: "hsl(var(--chart-2))",
    defaultPercentage: 30,
    transactionCategories: ["Casa", "Contas", "Aluguel", "Água", "Luz", "Internet", "Telefone"],
  },
  {
    id: "conforto",
    name: "Conforto",
    color: "hsl(var(--chart-3))",
    defaultPercentage: 15,
    transactionCategories: ["Alimentação", "Transporte", "Saúde", "Mercado"],
  },
  {
    id: "metas",
    name: "Metas",
    color: "hsl(var(--chart-4))",
    defaultPercentage: 15,
    transactionCategories: ["Viagem", "Reservas", "Objetivos"],
  },
  {
    id: "prazeres",
    name: "Prazeres",
    color: "hsl(var(--chart-5))",
    defaultPercentage: 10,
    transactionCategories: ["Lazer", "Compras", "Entretenimento", "Restaurante"],
  },
  {
    id: "conhecimento",
    name: "Conhecimento",
    color: "hsl(var(--primary))",
    defaultPercentage: 5,
    transactionCategories: ["Educação", "Livros", "Cursos"],
  },
];

// Income categories (for TransactionForm)
export const incomeCategories = [
  "Salário",
  "Freelance",
  "Investimentos",
  "Presente",
  "Bônus",
  "Aluguel Recebido",
  "Outros",
];

// Expense categories (for TransactionForm) - derived from all budget category mappings
export const expenseCategories = [
  // Custos Fixos
  "Casa",
  "Contas",
  "Aluguel",
  "Água",
  "Luz",
  "Internet",
  "Telefone",
  // Conforto
  "Alimentação",
  "Transporte",
  "Saúde",
  "Mercado",
  // Prazeres
  "Lazer",
  "Compras",
  "Entretenimento",
  "Restaurante",
  // Conhecimento
  "Educação",
  "Livros",
  "Cursos",
  // Metas
  "Viagem",
  "Reservas",
  "Objetivos",
  // Liberdade Financeira
  "Investimentos",
  "Poupança",
  "Reserva",
  // Other
  "Outros",
];

// Get budget category for a transaction category
export function getBudgetCategoryForTransaction(transactionCategory: string): BudgetCategory | null {
  return defaultBudgetCategories.find((bc) =>
    bc.transactionCategories.some(
      (tc) => tc.toLowerCase() === transactionCategory.toLowerCase()
    )
  ) || null;
}

// Group expenses by budget category
export function groupExpensesByBudgetCategory(
  expenses: { category: string; amount: number }[]
): Record<string, number> {
  const result: Record<string, number> = {};

  // Initialize all budget categories with 0
  defaultBudgetCategories.forEach((bc) => {
    result[bc.name] = 0;
  });
  result["Sem categoria"] = 0;

  expenses.forEach((expense) => {
    const budgetCategory = getBudgetCategoryForTransaction(expense.category);
    if (budgetCategory) {
      result[budgetCategory.name] += expense.amount;
    } else {
      result["Sem categoria"] += expense.amount;
    }
  });

  // Remove "Sem categoria" if empty
  if (result["Sem categoria"] === 0) {
    delete result["Sem categoria"];
  }

  return result;
}
