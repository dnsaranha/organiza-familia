import { AIChatRequest, AIChatResponse } from '@/types/ai';
import { aiCalibrationService } from './aiCalibrationService';

export async function sendAIChatMessage(request: AIChatRequest): Promise<AIChatResponse> {
  try {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (res.ok) {
      const data: AIChatResponse = await res.json();
      // Record usage locally/remote
      await aiCalibrationService.recordUsage({
        userId: request.userId,
        userEmail: request.userEmail,
        userPlan: request.userPlan,
        messageExcerpt: request.message,
        promptTokens: data.usage.promptTokens,
        responseTokens: data.usage.responseTokens,
        costUsd: data.usage.costUsd,
        costBrl: data.usage.costBrl,
        modelUsed: data.modelUsed,
      });
      return data;
    }

    const errJson = await res.json().catch(() => null);
    throw new Error(errJson?.error || `Erro ${res.status} ao contatar assistente de IA`);
  } catch (err: any) {
    console.error('Error calling /api/ai/chat:', err);
    throw err;
  }
}
