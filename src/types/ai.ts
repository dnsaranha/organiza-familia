export interface AIAssistantSettings {
  id: string;
  is_active: boolean;
  model_name: string;
  system_prompt: string;
  tone: string;
  max_output_tokens: number;
  free_plan_monthly_limit: number;
  knowledge_base: string;
  disclaimer: string;
  updated_at: string;
  updated_by?: string;
}

export interface AIUsageLog {
  id: string;
  user_id: string;
  user_email?: string;
  user_plan?: string;
  message_excerpt?: string;
  prompt_tokens: number;
  response_tokens: number;
  total_tokens: number;
  cost_usd: number;
  cost_brl: number;
  model_used: string;
  created_at: string;
}

export interface AICostConsolidation {
  totalInteractions: number;
  totalPromptTokens: number;
  totalResponseTokens: number;
  totalTokens: number;
  totalCostUsd: number;
  totalCostBrl: number;
  averageCostPerMessageBrl: number;
  uniqueUsersCount: number;
}

export interface AIUserUsageSummary {
  user_id: string;
  user_email: string;
  user_plan: string;
  total_messages: number;
  prompt_tokens: number;
  response_tokens: number;
  total_tokens: number;
  total_cost_brl: number;
  total_cost_usd: number;
  last_interaction_at: string;
}

export interface AIChatFinancialCategory {
  category: string;
  amount: number;
  percentage: number;
}

export interface AIChatRecentTransaction {
  date: string;
  description: string;
  category: string;
  amount: number;
  type: 'income' | 'expense';
  paymentMethod?: string;
}

export interface AIChatInvestmentItem {
  ticker: string;
  assetName?: string;
  assetType?: string;
  quantity: number;
  averagePrice: number;
  totalCost: number;
}

export interface AIChatGoalItem {
  title: string;
  targetAmount: number;
  currentAmount: number;
  progressPercentage: number;
  deadline?: string;
}

export interface AIChatUpcomingBill {
  title: string;
  amount: number;
  dueDate: string;
  category?: string;
}

export interface AIChatFinancialContext {
  monthlyIncome?: number;
  monthlyExpenses?: number;
  balance?: number;
  savingsRate?: number;
  activeGoalsCount?: number;
  topCategory?: string;
  totalInvested?: number;
  topCategories?: AIChatFinancialCategory[];
  recentTransactions?: AIChatRecentTransaction[];
  portfolioItems?: AIChatInvestmentItem[];
  investmentAllocations?: Record<string, { amount: number; percentage: number }>;
  goals?: AIChatGoalItem[];
  upcomingBills?: AIChatUpcomingBill[];
}

export interface AIChatRequest {
  userId: string;
  userEmail?: string;
  userPlan?: string;
  message: string;
  financialSummary?: AIChatFinancialContext;
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

export interface AIChatResponse {
  reply: string;
  modelUsed: string;
  usage: {
    promptTokens: number;
    responseTokens: number;
    totalTokens: number;
    costUsd: number;
    costBrl: number;
  };
}

export type SmartDraftType = 'transaction' | 'goal' | 'investment' | 'scheduled_task';

export interface SmartDraftTransaction {
  type: 'expense' | 'income';
  amount: number;
  description: string;
  category: string;
  date: string; // YYYY-MM-DD
  payment_method?: string;
}

export interface SmartDraftGoal {
  title: string;
  target_amount: number;
  current_amount?: number;
  category?: string;
  deadline?: string; // YYYY-MM-DD
  monthly_contribution?: number;
}

export interface SmartDraftInvestment {
  ticker: string;
  asset_name: string;
  transaction_type: 'buy' | 'sell';
  quantity: number;
  price: number;
  transaction_date: string; // YYYY-MM-DD
  asset_type?: string;
  notes?: string;
}

export interface SmartDraftScheduledTask {
  title: string;
  task_type: 'expense' | 'income' | 'reminder';
  value: number;
  schedule_date: string; // YYYY-MM-DD
  category?: string;
  is_recurring?: boolean;
  recurrence_pattern?: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

export interface SmartDraft {
  id: string;
  draftType: SmartDraftType;
  title: string;
  transaction?: SmartDraftTransaction;
  goal?: SmartDraftGoal;
  investment?: SmartDraftInvestment;
  scheduled_task?: SmartDraftScheduledTask;
  status: 'pending' | 'saved' | 'discarded';
}
