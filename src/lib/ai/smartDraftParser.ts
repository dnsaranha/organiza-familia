import {
  SmartDraft,
  SmartDraftType,
  SmartDraftTransaction,
  SmartDraftGoal,
  SmartDraftInvestment,
  SmartDraftScheduledTask
} from '@/types/ai';

// Format today's date as YYYY-MM-DD
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper to extract amounts from natural language (e.g. "R$ 120,50", "120 reais", "120", "1.250,00")
function extractAmount(text: string): number | null {
  // Matches "R$ 120,50", "R$120", "120,50", "120 reais", "120.00"
  const regex = /(?:R\$\s*|R\$\s*|)(\d{1,3}(?:\.\d{3})*|\d+)(?:[.,](\d{1,2}))?(?:\s*(?:reais|real|conto|pila))?/i;
  const match = text.match(regex);
  if (!match) return null;

  // Let's find matches that look like financial numbers
  const allMatches = Array.from(text.matchAll(/(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*|\d+)(?:[.,](\d{1,2}))?(?:\s*(?:reais|real))?/gi));
  for (const m of allMatches) {
    const rawInt = m[1].replace(/\./g, '');
    const rawDec = m[2] ? m[2].padEnd(2, '0') : '00';
    const val = parseFloat(`${rawInt}.${rawDec}`);
    if (!isNaN(val) && val > 0 && val < 10000000) {
      return val;
    }
  }
  return null;
}

// Helper to deduce category from description and keywords
function deduceCategory(text: string): string {
  const lower = text.toLowerCase();

  if (/(mercado|pão de açúcar|supermercado|carrefour|açougue|padaria|feira|hortifruti)/.test(lower)) {
    return 'Alimentação';
  }
  if (/(almoço|jantar|lanche|restaurante|ifood|burger|pizza|café|comida|mcdonald)/.test(lower)) {
    return 'Alimentação';
  }
  if (/(uber|99|combustível|gasolina|etanol|posto|estacionamento|pedágio|ônibus|metrô|táxi)/.test(lower)) {
    return 'Transporte';
  }
  if (/(aluguel|condomínio|luz|energia|água|gás|internet|iptu|enel|sabesp)/.test(lower)) {
    return 'Moradia';
  }
  if (/(cinema|streaming|netflix|spotify|bar|show|jogo|viagem|hotel|praia)/.test(lower)) {
    return 'Lazer';
  }
  if (/(farmácia|remédio|médico|consulta|dentista|hospital|exame|drogaria)/.test(lower)) {
    return 'Saúde';
  }
  if (/(curso|escola|faculdade|livro|mensalidade|educação)/.test(lower)) {
    return 'Educação';
  }
  if (/(salário|pagamento|provento|comissão|remuneração)/.test(lower)) {
    return 'Salário';
  }
  if (/(rendimento|dividendo|juros|lucro)/.test(lower)) {
    return 'Investimentos';
  }

  return 'Outros';
}

// Helper to deduce payment method
function deducePaymentMethod(text: string): string | undefined {
  const lower = text.toLowerCase();
  if (/débito|debito|cartão de débito/.test(lower)) return 'Débito';
  if (/crédito|credito|cartão de crédito/.test(lower)) return 'Crédito';
  if (/pix/.test(lower)) return 'Pix';
  if (/dinheiro|em espécie|cash/.test(lower)) return 'Dinheiro';
  return undefined;
}

// Fallback heuristic parser for user messages
export function parseUserMessageHeuristic(userMessage: string): SmartDraft | null {
  const lower = userMessage.toLowerCase().trim();
  const today = getTodayDateString();

  // 1. Check for Investment intent
  // "comprei 10 cotas de MXRF11 a 10.50", "investi 500 no tesouro selic"
  const tickerMatch = userMessage.match(/\b([A-Za-z]{4}[0-9]{1,2}|tesouro\s+selic|cdb|lci|lca)\b/i);
  const isInvestWord = /(investi|comprei\s+ações|comprei\s+cotas|comprei\s+fii|vendi\s+ações|aporte|investimento)/i.test(lower);
  
  if (tickerMatch || (isInvestWord && /(MXRF11|PETR4|VALE3|ITUB4|BBAS3|HGLG11|KNCR11|SELIC|CDB)/i.test(userMessage))) {
    const rawTicker = tickerMatch ? tickerMatch[1].toUpperCase() : 'ATIVO';
    const isSell = /vendi|venda/i.test(lower);
    const amount = extractAmount(userMessage) || 100;
    
    // Check quantity e.g. "10 cotas", "100 ações", "10 de"
    const qtyMatch = userMessage.match(/(\d+)\s*(?:cotas|ações|papeis|unidades)/i);
    const quantity = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
    const price = quantity > 1 && amount > quantity ? Number((amount / quantity).toFixed(2)) : amount;

    const investment: SmartDraftInvestment = {
      ticker: rawTicker,
      asset_name: rawTicker.includes('MXRF') ? 'Maxi Renda FII' : rawTicker,
      transaction_type: isSell ? 'sell' : 'buy',
      quantity,
      price: price > 0 ? price : 10,
      transaction_date: today,
    };

    return {
      id: `draft-${Date.now()}`,
      draftType: 'investment',
      title: `${isSell ? 'Venda' : 'Compra'} de ${investment.ticker}`,
      investment,
      status: 'pending',
    };
  }

  // 2. Check for Goal intent
  // "meta de juntar 10000 para viagem", "quero poupar 5000 para reserva"
  const isGoal = /(meta|poupar\s+para|juntar\s+para|guardar\s+para|objetivo)/i.test(lower);
  if (isGoal) {
    const amount = extractAmount(userMessage) || 1000;
    let title = 'Minha Nova Meta';
    if (/viagem/i.test(lower)) title = 'Viagem';
    else if (/reserva|emergência/i.test(lower)) title = 'Reserva de Emergência';
    else if (/carro|veículo|moto/i.test(lower)) title = 'Comprar Veículo';
    else if (/casa|imóvel|apartamento/i.test(lower)) title = 'Casa Própria';
    else if (/casamento/i.test(lower)) title = 'Casamento';

    const goal: SmartDraftGoal = {
      title,
      target_amount: amount,
      current_amount: 0,
      category: title,
    };

    return {
      id: `draft-${Date.now()}`,
      draftType: 'goal',
      title: `Nova Meta: ${title}`,
      goal,
      status: 'pending',
    };
  }

  // 3. Check for Scheduled Task / Bill Reminder intent
  // "agendar conta de luz de 180 dia 15", "lembrete pagar água 90 reais dia 20"
  const isSchedule = /(agendar|lembrete|lembrar|conta\s+de\s+luz|conta\s+de\s+água|vence\s+dia|pagar\s+dia|vencimento)/i.test(lower);
  if (isSchedule) {
    const amount = extractAmount(userMessage) || 0;
    let title = 'Lembrete de Conta';
    if (/luz|energia|enel|copel|cemig/i.test(lower)) title = 'Conta de Luz';
    else if (/água|sabesp|sanepar/i.test(lower)) title = 'Conta de Água';
    else if (/aluguel/i.test(lower)) title = 'Aluguel';
    else if (/condomínio/i.test(lower)) title = 'Condomínio';
    else if (/cartão/i.test(lower)) title = 'Fatura do Cartão';
    else if (/internet/i.test(lower)) title = 'Internet';

    // Try extracting day e.g. "dia 15", "dia 20"
    let scheduleDate = today;
    const dayMatch = userMessage.match(/dia\s*(\d{1,2})/i);
    if (dayMatch) {
      const dayNum = parseInt(dayMatch[1], 10);
      if (dayNum >= 1 && dayNum <= 31) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        scheduleDate = `${year}-${month}-${String(dayNum).padStart(2, '0')}`;
      }
    }

    const scheduled_task: SmartDraftScheduledTask = {
      title,
      task_type: 'expense',
      value: amount,
      schedule_date: scheduleDate,
      category: deduceCategory(title),
      is_recurring: false,
    };

    return {
      id: `draft-${Date.now()}`,
      draftType: 'scheduled_task',
      title: `Agendamento: ${title}`,
      scheduled_task,
      status: 'pending',
    };
  }

  // 4. Check for Expense / Income Transaction intent
  // e.g. "Gastei R$ 120 no mercado Pão de Açúcar no débito hoje"
  // "paguei 50 no almoço", "comprei pizza por 60 reais", "recebi 2000"
  const hasExpenseWord = /(gastei|paguei|comprei|gasto|despesa|almoço|jantar|mercado|farmácia|uber)/i.test(lower);
  const hasIncomeWord = /(recebi|ganhei|salário|venda|caiu\s+um\s+pix|depósito)/i.test(lower);

  const amount = extractAmount(userMessage);

  if (amount && (hasExpenseWord || hasIncomeWord || /r\$\s*\d+/i.test(userMessage))) {
    const isIncome = hasIncomeWord && !hasExpenseWord;
    const category = deduceCategory(userMessage);
    const paymentMethod = deducePaymentMethod(userMessage);

    // Extract a nice description
    let description = isIncome ? 'Receita Recebida' : 'Gasto Informado';

    // Clean up typical prefix phrases like "gastei R$ 120 no mercado Pão de Açúcar no débito hoje"
    const descMatch = userMessage.match(/(?:gastei|paguei|comprei|no|na|com)\s+(?:r\$\s*\d+[.,]?\d*\s*(?:reais)?\s*(?:no|na|em|de)?\s*)?([^.,\n]+)/i);
    if (descMatch && descMatch[1]) {
      let candidate = descMatch[1].trim();
      // Remove trailing "no débito", "no crédito", "hoje", "ontem"
      candidate = candidate
        .replace(/\b(no\s+débito|no\s+credito|no\s+crédito|no\s+debito|no\s+pix|no\s+dinheiro|hoje|ontem)\b/gi, '')
        .trim();
      if (candidate.length > 2) {
        description = candidate.charAt(0).toUpperCase() + candidate.slice(1);
      }
    } else if (category !== 'Outros') {
      description = category;
    }

    const transaction: SmartDraftTransaction = {
      type: isIncome ? 'income' : 'expense',
      amount,
      description,
      category,
      date: today,
      payment_method: paymentMethod,
    };

    return {
      id: `draft-${Date.now()}`,
      draftType: 'transaction',
      title: `${isIncome ? 'Receita' : 'Despesa'}: ${description}`,
      transaction,
      status: 'pending',
    };
  }

  return null;
}

// Master parsing function: checks AI reply for ```json:draft block first, and falls back to userMessage heuristic
export function parseSmartDraft(
  userMessage: string,
  aiReplyText: string
): { cleanReply: string; draft: SmartDraft | null } {
  let cleanReply = aiReplyText;
  let draft: SmartDraft | null = null;

  // 1. Try finding ```json:draft ... ``` or ```json ... ``` with draftType
  const draftBlockRegex = /```(?:json:draft|json)\s*(\{[\s\S]*?"draftType"[\s\S]*?\})\s*```/i;
  const match = aiReplyText.match(draftBlockRegex);

  if (match && match[1]) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed.draftType) {
        draft = {
          id: `draft-${Date.now()}`,
          draftType: parsed.draftType,
          title: parsed.title || 'Rascunho Inteligente',
          transaction: parsed.transaction,
          goal: parsed.goal,
          investment: parsed.investment,
          scheduled_task: parsed.scheduled_task,
          status: 'pending',
        };
        // Remove the json block from the visible reply text
        cleanReply = aiReplyText.replace(draftBlockRegex, '').trim();
      }
    } catch (e) {
      console.warn('Falha ao processar bloco json:draft retornado pela IA:', e);
    }
  }

  // 2. If no draft in AI reply, use heuristic parser on user's message
  if (!draft) {
    draft = parseUserMessageHeuristic(userMessage);
  }

  return {
    cleanReply,
    draft,
  };
}
