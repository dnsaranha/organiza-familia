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
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
    topCategories?: Array<{ category: string; amount: number; percentage: number }>;
    recentTransactions?: Array<{
      date: string;
      description: string;
      category: string;
      amount: number;
      type: 'income' | 'expense';
      paymentMethod?: string;
    }>;
    portfolioItems?: Array<{
      ticker: string;
      assetName?: string;
      assetType?: string;
      quantity: number;
      averagePrice: number;
      totalCost: number;
    }>;
    investmentAllocations?: Record<string, { amount: number; percentage: number }>;
    goals?: Array<{
      title: string;
      targetAmount: number;
      currentAmount: number;
      progressPercentage: number;
      deadline?: string;
    }>;
    upcomingBills?: Array<{
      title: string;
      amount: number;
      dueDate: string;
      category?: string;
    }>;
  };
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

export async function processAIChat(data: ServerChatRequest) {
  const ai = getAIClient();

  const calib = data.calibrationSettings || {};
  const tone = calib.tone || 'analítico, consultivo, acolhedor e focado em finanças familiares e investimentos';
  const customPrompt =
    calib.system_prompt ||
    'Você é o Analista Financeiro Pessoal do usuário no Organiza, especialista em finanças familiares e investimentos.';
  const knowledge = calib.knowledge_base || '';
  const disclaimer =
    calib.disclaimer ||
    'As orientações têm finalidade educativa e informativa, não constituindo recomendação formal nos termos da CVM.';
  const preferredModel =
    calib.model_name && calib.model_name !== 'gemini-3.8-flash'
      ? calib.model_name
      : 'gemini-3.1-flash-lite';
  const maxTokens = calib.max_output_tokens || 800;

  // Build comprehensive analytical context from user financial data
  let financialContext = '';
  if (data.financialSummary) {
    const fs = data.financialSummary;
    const lines: string[] = [];
    lines.push('\n[DADOS REAIS DO USUÁRIO - PAINEL DO ANALISTA FINANCEIRO PESSOAL]:');

    // Fluxo de caixa do mês atual
    lines.push('--- FLUXO DE CAIXA E CONSUMO (MÊS ATUAL) ---');
    if (fs.monthlyIncome !== undefined) lines.push(`• Receitas do Mês: R$ ${fs.monthlyIncome.toFixed(2)}`);
    if (fs.monthlyExpenses !== undefined) lines.push(`• Despesas Totais do Mês: R$ ${fs.monthlyExpenses.toFixed(2)}`);
    if (fs.balance !== undefined) lines.push(`• Saldo Líquido do Mês: R$ ${fs.balance.toFixed(2)}`);
    if (fs.savingsRate !== undefined) lines.push(`• Taxa de Poupança: ${fs.savingsRate.toFixed(1)}% da renda`);

    // Categorias de consumo detalhadas
    if (fs.topCategories && fs.topCategories.length > 0) {
      lines.push('• Distribuição dos Gastos por Categoria:');
      fs.topCategories.forEach((cat, idx) => {
        lines.push(`  ${idx + 1}. ${cat.category}: R$ ${cat.amount.toFixed(2)} (${cat.percentage.toFixed(1)}% das despesas)`);
      });
    } else if (fs.topCategory) {
      lines.push(`• Principal Categoria de Gasto: ${fs.topCategory}`);
    }

    // Últimos lançamentos de consumo e receita
    if (fs.recentTransactions && fs.recentTransactions.length > 0) {
      lines.push('• Últimos Gastos e Lançamentos Recentes:');
      fs.recentTransactions.forEach((t) => {
        const sign = t.type === 'income' ? '(+ Entrada)' : '(- Saída)';
        const pay = t.paymentMethod ? ` [${t.paymentMethod}]` : '';
        lines.push(`  - ${t.date}: ${t.description} (${t.category})${pay} ${sign} R$ ${t.amount.toFixed(2)}`);
      });
    }

    // Carteira de Investimentos
    lines.push('--- CARTEIRA DE INVESTIMENTOS DO USUÁRIO ---');
    if (fs.totalInvested !== undefined) {
      lines.push(`• Patrimônio Total Aplicado: R$ ${fs.totalInvested.toFixed(2)}`);
    } else {
      lines.push('• Patrimônio Total Aplicado: R$ 0,00 (Nenhum investimento cadastrado até o momento)');
    }

    if (fs.investmentAllocations && Object.keys(fs.investmentAllocations).length > 0) {
      lines.push('• Distribuição por Classe de Ativos:');
      Object.entries(fs.investmentAllocations).forEach(([classe, info]) => {
        lines.push(`  - ${classe}: R$ ${info.amount.toFixed(2)} (${info.percentage.toFixed(1)}%)`);
      });
    }

    if (fs.portfolioItems && fs.portfolioItems.length > 0) {
      lines.push('• Posições / Ativos Detalhados em Carteira:');
      fs.portfolioItems.forEach((pos) => {
        lines.push(`  - ${pos.ticker} (${pos.assetName || pos.assetType || 'Ativo'}): ${pos.quantity} cotas/ações, Preço Médio R$ ${pos.averagePrice.toFixed(2)} (Total investido: R$ ${pos.totalCost.toFixed(2)})`);
      });
    }

    // Metas Financeiras
    if (fs.goals && fs.goals.length > 0) {
      lines.push('--- METAS FINANCEIRAS DO USUÁRIO ---');
      fs.goals.forEach((g) => {
        const prazo = g.deadline ? ` (Prazo: ${g.deadline})` : '';
        lines.push(`• ${g.title}: R$ ${g.currentAmount.toFixed(2)} acumulados de R$ ${g.targetAmount.toFixed(2)} [${g.progressPercentage.toFixed(1)}% concluído]${prazo}`);
      });
    } else if (fs.activeGoalsCount !== undefined) {
      lines.push(`• Metas Ativas: ${fs.activeGoalsCount}`);
    }

    // Próximas contas agendadas
    if (fs.upcomingBills && fs.upcomingBills.length > 0) {
      lines.push('--- PRÓXIMOS VENCIMENTOS / CONTAS A PAGAR ---');
      fs.upcomingBills.forEach((b) => {
        lines.push(`• ${b.title}: R$ ${b.amount.toFixed(2)} (Vencimento: ${b.dueDate})`);
      });
    }

    lines.push('\nUse estes dados ativamente para responder com exatidão sobre a vida financeira do usuário sempre que ele perguntar sobre gastos, consumo, metas ou investimentos.');
    financialContext = lines.join('\n');
  }

  const todayDate = new Date().toISOString().split('T')[0];

  const systemInstruction = `${customPrompt}

TOM DE VOZ: ${tone}.
BASE DE CONHECIMENTO DO APP ORGANIZA:
${knowledge}

DIRETRIZES DO ANALISTA FINANCEIRO PESSOAL:
1. Responda em Português do Brasil com linguagem clara, empática, profissional e objetiva.
2. Utilize os dados reais de receitas, despesas, consumo e investimentos fornecidos acima para dar respostas personalizadas e analíticas com números concretos quando o usuário perguntar.
3. Formate com tópicos, listas numeradas e negrito para leitura ágil no celular.
4. Se o usuário quiser suporte humano ou reportar um erro técnico na conta, recomende clicar no botão "Falar com Atendente Humano".

5. POLÍTICA DE CONFORMIDADE REGULATÓRIA (CVM / ANBIMA / LEGISLAÇÃO):
- REGRA CRÍTICA: NÃO fique repetindo avisos legais ou disclaimers a todo momento. Respostas normais sobre planejamento, orçamento, análise de gastos, hábitos de consumo, organização familiar e conceitos financeiros NUNCA devem conter avisos de isenção de responsabilidade.
- SOMENTE quando a resposta conduzir diretamente a uma sugestão que possa ser interpretada como recomendação específica de compra ou venda de um ativo pontual (ações, FIIs, etc.), ou quando o usuário pedir explicitamente "qual ação comprar?", adicione ao final uma breve nota sutil e sucinta informando que o conteúdo tem caráter educativo e analítico, sem configurar recomendação formal de compra/venda nos termos da CVM (${disclaimer}), orientando sobre critérios técnicos/fundamentalistas para a tomada de decisão.

6. RECURSO RASCUNHO INTELIGENTE (AÇÕES FINANCEIRAS):
Data de hoje: ${todayDate}.
Quando o usuário relatar ou pedir para registrar:
- Gasto ou Ganho (ex: "Gastei R$ 120 no mercado Pão de Açúcar no débito hoje", "Paguei 40 no almoço", "Recebi 3000 de salário"):
  Além de confirmar a mensagem de forma curta e amigável, você DEVE gerar ao final da resposta o seguinte bloco exato:
\`\`\`json:draft
{
  "draftType": "transaction",
  "title": "Registro de Transação",
  "transaction": {
    "type": "expense" | "income",
    "amount": 120.00,
    "description": "Mercado Pão de Açúcar",
    "category": "Alimentação",
    "date": "${todayDate}",
    "payment_method": "Débito"
  }
}
\`\`\`

- Meta Financeira (ex: "Quero juntar 10000 para viagem", "Meta de 5000 para reserva"):
\`\`\`json:draft
{
  "draftType": "goal",
  "title": "Nova Meta",
  "goal": {
    "title": "Viagem",
    "target_amount": 10000.00,
    "current_amount": 0,
    "category": "Viagem",
    "deadline": "YYYY-MM-DD"
  }
}
\`\`\`

- Investimento (ex: "Comprei 10 cotas de MXRF11 a R$ 10,50", "Investi 500 no Tesouro Selic"):
\`\`\`json:draft
{
  "draftType": "investment",
  "title": "Registro de Investimento",
  "investment": {
    "ticker": "MXRF11",
    "asset_name": "Maxi Renda FII",
    "transaction_type": "buy",
    "quantity": 10,
    "price": 10.50,
    "transaction_date": "${todayDate}"
  }
}
\`\`\`

- Agendamento / Lembrete de Conta (ex: "Agendar conta de luz de R$ 180 dia 15", "Lembrar de pagar condomínio"):
\`\`\`json:draft
{
  "draftType": "scheduled_task",
  "title": "Agendamento de Conta",
  "scheduled_task": {
    "title": "Conta de Luz",
    "task_type": "expense",
    "value": 180.00,
    "schedule_date": "YYYY-MM-DD",
    "category": "Moradia",
    "is_recurring": false
  }
}
\`\`\`
${financialContext}`;

  // Build message sequence or prompt
  const userMessage = data.message;

  // Model fallback chain:
  // gemini-3.1-flash-lite has the highest availability and fast throughput (~0.3s) during spikes.
  const candidateModels = [
    'gemini-3.1-flash-lite',
    preferredModel !== 'gemini-3.1-flash-lite' ? preferredModel : null,
    'gemini-flash-latest',
    'gemini-3.8-flash',
  ].filter(Boolean) as string[];
  const modelsToTry = Array.from(new Set(candidateModels));
  
  let lastError: any = null;
  for (const model of modelsToTry) {
    // Attempt up to 2 times for each model if 503 or 429
    for (let attempt = 0; attempt < 2; attempt++) {
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
        lastError = err;
        const errMsg = err?.message || String(err);
        const isTemporarySpike = errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('UNAVAILABLE');

        if (isTemporarySpike && attempt === 0) {
          // Quick jittered backoff before second attempt on same model
          await wait(500);
          continue;
        }

        // Informative log without dumping raw error JSON to stderr
        console.info(`[AI Orchestrator] Model ${model} is currently busy; trying alternate model...`);
        // Move to the next model in the fallback chain
        break;
      }
    }
  }

  // Graceful fallback if Google API is experiencing a peak across all endpoints
  return {
    reply: 'Olá! No momento os servidores de IA estão operando com alta demanda temporária.\n\nEnquanto o serviço normaliza, lembre-se das diretrizes do Organiza:\n- **Regra 50/30/20**: 50% para necessidades básicas, 30% para desejos pessoais e 20% para reserva financeira ou metas.\n- **Reserva de Emergência**: Mantenha de 3 a 6 meses do seu custo de vida seguro em renda fixa com liquidez diária.\n\nSe preferir falar com nossa equipe, clique no botão **"Humano"** no topo do chat, ou envie sua pergunta novamente em alguns instantes!',
    modelUsed: 'gemini-fallback',
    usage: {
      promptTokens: 0,
      responseTokens: 0,
      totalTokens: 0,
      costUsd: 0,
      costBrl: 0,
    },
  };
}
