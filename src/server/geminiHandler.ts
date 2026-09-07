import { GoogleGenAI } from '@google/genai';

const USD_BRL_RATE = 5.60;

// Lazy initialization of Gemini client
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is missing.');
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

export interface ServerChatRequest {
  message: string;
  userId?: string;
  userEmail?: string;
  userPlan?: string;
  calibrationSettings?: {
    system_prompt?: string;
    tone?: string;
    max_output_tokens?: number;
    knowledge_base?: string;
    disclaimer?: string;
    model_name?: string;
  };
  financialSummary?: {
    monthlyIncome?: number;
    monthlyExpenses?: number;
    balance?: number;
    savingsRate?: number;
    activeGoalsCount?: number;
    topCategory?: string;
    totalInvested?: number;
  };
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

export async function processAIChat(data: ServerChatRequest) {
  const ai = getAIClient();

  const calib = data.calibrationSettings || {};
  const tone = calib.tone || 'didático, acolhedor e focado em finanças familiares';
  const customPrompt = calib.system_prompt || 'Você é o Assistente Financeiro do Organiza.';
  const knowledge = calib.knowledge_base || '';
  const disclaimer = calib.disclaimer || 'Orientações de cunho puramente educativo e organizacional.';
  const preferredModel = calib.model_name || 'gemini-3.8-flash';
  const maxTokens = calib.max_output_tokens || 800;

  // Build grounded context from financial summary if present
  let financialContext = '';
  if (data.financialSummary) {
    const fs = data.financialSummary;
    financialContext = `\n\n[CONTEXTO FINANCEIRO DO USUÁRIO]:
- Renda do Mês: ${fs.monthlyIncome !== undefined ? `R$ ${fs.monthlyIncome.toFixed(2)}` : 'Não informada'}
- Gastos do Mês: ${fs.monthlyExpenses !== undefined ? `R$ ${fs.monthlyExpenses.toFixed(2)}` : 'Não informados'}
- Saldo do Mês: ${fs.balance !== undefined ? `R$ ${fs.balance.toFixed(2)}` : 'Não informado'}
- Metas Financeiras em Andamento: ${fs.activeGoalsCount ?? 0}
- Principal Categoria de Gasto: ${fs.topCategory || 'Diversos'}
- Total em Investimentos: ${fs.totalInvested !== undefined ? `R$ ${fs.totalInvested.toFixed(2)}` : 'Não informado'}
Use este contexto apenas para enriquecer didaticamente sua resposta, sem expor dados que o usuário não perguntou.`;
  }

  const systemInstruction = `${customPrompt}

TOM DE VOZ: ${tone}.
BASE DE CONHECIMENTO DO APP ORGANIZA:
${knowledge}

DIRETRIZES FUNDAMENTAIS:
1. Responda em Português do Brasil com linguagem clara, empática e objetiva.
2. Formate com tópicos, listas numeradas e negrito para leitura ágil no celular.
3. Se o usuário quiser suporte humano ou reportar um erro técnico, recomende clicar no botão "Falar com Atendente Humano".
4. Respeite as regras de CVM: nunca faça recomendações diretas de compra/venda de ativos específicos ("compre ação X").
5. Adicione um aviso legal sutil ao final quando o assunto envolver investimentos.
${financialContext}`;

  // Build message sequence or prompt
  const userMessage = data.message;

  // Model fallback chain: try preferred, then flash-latest, then flash-lite
  const modelsToTry = Array.from(new Set([preferredModel, 'gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite']));
  
  let lastError: any = null;
  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: userMessage,
        config: {
          systemInstruction,
          maxOutputTokens: maxTokens,
        },
      });

      const replyText = response.text || 'Desculpe, não consegui elaborar uma resposta no momento.';
      const promptTokens = response.usageMetadata?.promptTokenCount || Math.ceil((systemInstruction.length + userMessage.length) / 4);
      const responseTokens = response.usageMetadata?.candidatesTokenCount || Math.ceil(replyText.length / 4);
      const totalTokens = promptTokens + responseTokens;

      // Pricing:
      // Prompt: $0.075 / 1,000,000
      // Response: $0.300 / 1,000,000
      const costUsd = Number(((promptTokens * 0.075 + responseTokens * 0.3) / 1000000).toFixed(6));
      const costBrl = Number((costUsd * USD_BRL_RATE).toFixed(6));

      return {
        reply: replyText,
        modelUsed: model,
        usage: {
          promptTokens,
          responseTokens,
          totalTokens,
          costUsd,
          costBrl,
        },
      };
    } catch (err: any) {
      console.warn(`Model ${model} failed with error:`, err?.message || err);
      lastError = err;
      // If 503, continue to fallback model
    }
  }

  throw lastError || new Error('Não foi possível gerar resposta com nenhum dos modelos.');
}
