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

export interface AIChatFinancialContext {
  monthlyIncome?: number;
  monthlyExpenses?: number;
  balance?: number;
  savingsRate?: number;
  activeGoalsCount?: number;
  topCategory?: string;
  totalInvested?: number;
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
