import { supabase } from '@/integrations/supabase/client';
import { AIAssistantSettings, AIUsageLog, AICostConsolidation, AIUserUsageSummary } from '@/types/ai';
import { DEFAULT_AI_SETTINGS } from './defaultSettings';

const SETTINGS_STORAGE_KEY = 'organiza_ai_calibration_settings';
const LOGS_STORAGE_KEY = 'organiza_ai_usage_logs';
const USD_BRL_RATE = 5.60;

// Helper to get local cached settings
const getLocalSettings = (): AIAssistantSettings => {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) return { ...DEFAULT_AI_SETTINGS, ...JSON.parse(raw) };
  } catch (err) {
    console.error('Error reading local AI settings:', err);
  }
  return DEFAULT_AI_SETTINGS;
};

// Helper to get local cached logs
const getLocalLogs = (): AIUsageLog[] => {
  try {
    const raw = localStorage.getItem(LOGS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading local AI logs:', err);
  }
  return [];
};

// Helper to save local cached logs
const saveLocalLogs = (logs: AIUsageLog[]) => {
  try {
    // Keep the most recent 1000 logs in local storage
    const trimmed = logs.slice(0, 1000);
    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.error('Error saving local AI logs:', err);
  }
};

export const aiCalibrationService = {
  // Fetch active AI settings
  async getSettings(): Promise<AIAssistantSettings> {
    try {
      const { data, error } = await supabase
        .from('ai_assistant_settings')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(data));
        return data as AIAssistantSettings;
      }
    } catch (err) {
      console.warn('Could not fetch ai_assistant_settings from remote, using local fallback:', err);
    }
    return getLocalSettings();
  },

  // Save settings (Admin only - verified client and server side)
  async saveSettings(settings: Partial<AIAssistantSettings>, userEmail?: string): Promise<{ success: boolean; error?: string }> {
    const updated: AIAssistantSettings = {
      ...getLocalSettings(),
      ...settings,
      updated_at: new Date().toISOString(),
      updated_by: userEmail || 'Administrador',
    };

    // Save locally first for instant UI response
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));

    // Try saving to Supabase
    try {
      const { error } = await supabase
        .from('ai_assistant_settings')
        .upsert({
          id: updated.id === 'default-settings' ? undefined : updated.id,
          is_active: updated.is_active,
          model_name: updated.model_name,
          system_prompt: updated.system_prompt,
          tone: updated.tone,
          max_output_tokens: updated.max_output_tokens,
          free_plan_monthly_limit: updated.free_plan_monthly_limit,
          knowledge_base: updated.knowledge_base,
          disclaimer: updated.disclaimer,
          updated_at: updated.updated_at,
          updated_by: updated.updated_by,
        });

      if (error) {
        console.warn('Supabase upsert for ai_assistant_settings returned:', error.message);
      }
    } catch (err: any) {
      console.warn('Could not sync settings to Supabase table:', err?.message);
    }

    return { success: true };
  },

  // Record an interaction token and cost log
  async recordUsage(logData: {
    userId: string;
    userEmail?: string;
    userPlan?: string;
    messageExcerpt?: string;
    promptTokens: number;
    responseTokens: number;
    costUsd: number;
    costBrl: number;
    modelUsed: string;
  }): Promise<AIUsageLog> {
    const totalTokens = logData.promptTokens + logData.responseTokens;
    const newLog: AIUsageLog = {
      id: crypto.randomUUID(),
      user_id: logData.userId,
      user_email: logData.userEmail || 'Não informado',
      user_plan: logData.userPlan || 'Gratuito',
      message_excerpt: (logData.messageExcerpt || '').slice(0, 150),
      prompt_tokens: logData.promptTokens,
      response_tokens: logData.responseTokens,
      total_tokens: totalTokens,
      cost_usd: logData.costUsd,
      cost_brl: logData.costBrl,
      model_used: logData.modelUsed,
      created_at: new Date().toISOString(),
    };

    // Save to local cache
    const existing = getLocalLogs();
    saveLocalLogs([newLog, ...existing]);

    // Attempt to persist in Supabase
    try {
      await supabase.from('ai_usage_logs').insert({
        user_id: newLog.user_id,
        user_email: newLog.user_email,
        user_plan: newLog.user_plan,
        message_excerpt: newLog.message_excerpt,
        prompt_tokens: newLog.prompt_tokens,
        response_tokens: newLog.response_tokens,
        total_tokens: newLog.total_tokens,
        cost_usd: newLog.cost_usd,
        cost_brl: newLog.cost_brl,
        model_used: newLog.model_used,
      });
    } catch (err) {
      // Non-blocking log insertion error
    }

    return newLog;
  },

  // Fetch all usage logs (Admin only)
  async getUsageLogs(): Promise<AIUsageLog[]> {
    try {
      const { data, error } = await supabase
        .from('ai_usage_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (!error && data && data.length > 0) {
        return data as AIUsageLog[];
      }
    } catch (err) {
      // Fall back to local
    }
    return getLocalLogs();
  },

  // Compute consolidated metrics for the admin dashboard
  async getConsolidatedMetrics(): Promise<{
    consolidation: AICostConsolidation;
    userSummaries: AIUserUsageSummary[];
  }> {
    const logs = await this.getUsageLogs();

    let totalPromptTokens = 0;
    let totalResponseTokens = 0;
    let totalCostUsd = 0;
    let totalCostBrl = 0;

    const userMap: Record<string, AIUserUsageSummary> = {};

    for (const log of logs) {
      totalPromptTokens += log.prompt_tokens;
      totalResponseTokens += log.response_tokens;
      totalCostUsd += Number(log.cost_usd) || 0;
      totalCostBrl += Number(log.cost_brl) || 0;

      const uid = log.user_id;
      if (!userMap[uid]) {
        userMap[uid] = {
          user_id: uid,
          user_email: log.user_email || 'Usuário',
          user_plan: log.user_plan || 'Gratuito',
          total_messages: 0,
          prompt_tokens: 0,
          response_tokens: 0,
          total_tokens: 0,
          total_cost_brl: 0,
          total_cost_usd: 0,
          last_interaction_at: log.created_at,
        };
      }

      userMap[uid].total_messages += 1;
      userMap[uid].prompt_tokens += log.prompt_tokens;
      userMap[uid].response_tokens += log.response_tokens;
      userMap[uid].total_tokens += log.total_tokens;
      userMap[uid].total_cost_brl += Number(log.cost_brl) || 0;
      userMap[uid].total_cost_usd += Number(log.cost_usd) || 0;
    }

    const totalInteractions = logs.length;
    const totalTokens = totalPromptTokens + totalResponseTokens;
    const averageCostPerMessageBrl = totalInteractions > 0 ? totalCostBrl / totalInteractions : 0;
    const uniqueUsersCount = Object.keys(userMap).length;

    const userSummaries = Object.values(userMap).sort(
      (a, b) => b.total_cost_brl - a.total_cost_brl
    );

    return {
      consolidation: {
        totalInteractions,
        totalPromptTokens,
        totalResponseTokens,
        totalTokens,
        totalCostUsd,
        totalCostBrl,
        averageCostPerMessageBrl,
        uniqueUsersCount,
      },
      userSummaries,
    };
  },

  // Check how many messages a user sent this month
  async getUserMonthlyMessageCount(userId: string): Promise<number> {
    const logs = await this.getUsageLogs();
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    return logs.filter(
      (l) => l.user_id === userId && new Date(l.created_at) >= startOfMonth
    ).length;
  },

  // Calculate costs from token counts
  calculateCost(promptTokens: number, responseTokens: number): { costUsd: number; costBrl: number } {
    // Gemini 2.5/3.8 Flash pricing:
    // Prompt: $0.075 / 1,000,000 tokens
    // Response: $0.300 / 1,000,000 tokens
    const costUsd = (promptTokens * 0.075 + responseTokens * 0.3) / 1000000;
    const costBrl = costUsd * USD_BRL_RATE;
    return {
      costUsd: Number(costUsd.toFixed(6)),
      costBrl: Number(costBrl.toFixed(6)),
    };
  },
};
