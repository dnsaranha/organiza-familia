import { AIChatRequest, AIChatResponse } from '@/types/ai';
import { aiCalibrationService } from './aiCalibrationService';
import { supabase } from '@/integrations/supabase/client';

export async function sendAIChatMessage(request: AIChatRequest): Promise<AIChatResponse> {
  // 1. Primary path: Full-stack Node / Express API route
  try {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data: AIChatResponse = await res.json();
      
      // Record usage locally/remote (non-blocking)
      aiCalibrationService.recordUsage({
        userId: request.userId,
        userEmail: request.userEmail,
        userPlan: request.userPlan,
        messageExcerpt: request.message,
        promptTokens: data.usage?.promptTokens || 0,
        responseTokens: data.usage?.responseTokens || 0,
        costUsd: data.usage?.costUsd || 0,
        costBrl: data.usage?.costBrl || 0,
        modelUsed: data.modelUsed || 'gemini',
      }).catch((logErr) => console.warn('Usage recording skipped:', logErr));

      return data;
    }
  } catch (err: any) {
    console.warn('Primary /api/ai/chat call did not succeed, attempting Supabase Edge Function fallback...', err?.message || err);
  }

  // 2. Secondary path: Supabase Edge Function fallback (for static hosts or CDN edge routing)
  try {
    const { data: edgeData, error: edgeError } = await supabase.functions.invoke('ai-chat', {
      body: request,
    });

    if (!edgeError && edgeData && edgeData.reply) {
      return edgeData as AIChatResponse;
    }
  } catch (edgeErr: any) {
    console.warn('Edge Function fallback did not succeed:', edgeErr?.message || edgeErr);
  }

  // 3. Resilient fallback so the user always receives a prompt response and never a dead UI
  return {
    reply: 'Olá! Não foi possível estabelecer conexão imediata com os servidores de IA no momento. Suas finanças continuam seguras e você pode usar todas as funções de receitas, despesas e metas do Organiza normalmente. Você também pode clicar no botão **"Humano"** no topo do chat para suporte direto com nossa equipe!',
    modelUsed: 'client-resilient-fallback',
    usage: { promptTokens: 0, responseTokens: 0, totalTokens: 0, costUsd: 0, costBrl: 0 },
  };
}
