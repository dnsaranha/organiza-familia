/**
 * Utilitário de Matemática Financeira e Cálculo de Renda Fixa
 * Suporta: % do CDI, IPCA + taxa, Prefixado (% a.a.), Selic e Poupança
 */

export interface MarketRates {
  cdiAnnual: number; // ex: 10.65 (10.65% a.a.)
  ipcaAnnual: number; // ex: 4.20 (4.20% a.a.)
  selicAnnual: number; // ex: 10.75 (10.75% a.a.)
  poupancaAnnual: number; // ex: 6.17 (6.17% a.a.)
}

// Taxas padrão de referência de mercado (atualizadas)
export const DEFAULT_MARKET_RATES: MarketRates = {
  cdiAnnual: 10.65,
  ipcaAnnual: 4.20,
  selicAnnual: 10.75,
  poupancaAnnual: 6.17,
};

export type FixedIncomeIndexType = "CDI" | "IPCA" | "PREFIXED" | "SELIC" | "POUPANCA";

export interface ParsedRate {
  indexType: FixedIncomeIndexType;
  rateValue: number; // Multiplicador para CDI (ex: 110 para 110%) ou taxa anual para Prefixado (ex: 12)
  spread: number; // Spread adicional (ex: 6.0 para IPCA + 6%)
  label: string; // "110% CDI", "IPCA + 6,00%", "12,50% a.a."
  isExemptFromIR: boolean; // Se for LCI, LCA, CRI, CRA
}

export interface FixedIncomeCalculationResult {
  initialAmount: number;
  currentGrossAmount: number;
  accruedInterest: number; // Juros brutos acumulados (R$)
  profitabilityPercent: number; // Rentabilidade acumulada (%)
  annualizedRatePercent: number; // Taxa anual nominal efetiva (%)
  businessDays: number; // Dias úteis decorridos
  calendarDays: number; // Dias corridos decorridos
  irRatePercent: number; // Alíquota de IR (0% se isento, ou 15% a 22.5%)
  irAmount: number; // Valor do imposto estimado
  currentNetAmount: number; // Saldo líquido estimado
  netInterest: number; // Juros líquidos recebidos (R$)
  parsedRate: ParsedRate;
  startDate: string;
  dueDate?: string;
  isExpired: boolean;
}

/**
 * Verifica se a categoria ou nome é isento de Imposto de Renda
 */
export function isExemptAsset(categoryOrName: string): boolean {
  const upper = (categoryOrName || "").toUpperCase();
  return (
    upper.includes("LCI") ||
    upper.includes("LCA") ||
    upper.includes("CRI") ||
    upper.includes("CRA") ||
    upper.includes("DEBÊNTURE INCENTIVADA") ||
    upper.includes("DEBENTURE INCENTIVADA")
  );
}

/**
 * Converte string livre (ex: "110% CDI", "IPCA + 6%", "12.5% a.a.") em estrutura padronizada
 */
export function parseFixedIncomeRate(
  rawRate?: string | null,
  assetName?: string | null,
  category?: string | null
): ParsedRate {
  const combined = `${rawRate || ""} ${assetName || ""} ${category || ""}`.toUpperCase();
  const isExempt = isExemptAsset(`${category || ""} ${assetName || ""}`);

  // 1. IPCA + Taxa (ex: "IPCA + 6%", "IPCA+6.5%", "IPCA + 5,8% a.a.")
  if (combined.includes("IPCA")) {
    const ipcaMatch = combined.match(/IPCA\s*\+?\s*([\d.,]+)\s*%?/);
    let spread = 5.5; // default spread if not specified
    if (ipcaMatch && ipcaMatch[1]) {
      spread = parseFloat(ipcaMatch[1].replace(",", "."));
    }
    return {
      indexType: "IPCA",
      rateValue: 100,
      spread: isNaN(spread) ? 5.5 : spread,
      label: `IPCA + ${spread.toFixed(2)}%`,
      isExemptFromIR: isExempt,
    };
  }

  // 2. % do CDI (ex: "110% CDI", "100% DO CDI", "95% CDI")
  if (combined.includes("CDI")) {
    const cdiMatch = combined.match(/([\d.,]+)\s*%\s*(?:DO\s*)?CDI/);
    if (cdiMatch && cdiMatch[1]) {
      const pct = parseFloat(cdiMatch[1].replace(",", "."));
      const validPct = isNaN(pct) ? 100 : pct;
      return {
        indexType: "CDI",
        rateValue: validPct,
        spread: 0,
        label: `${validPct}% CDI`,
        isExemptFromIR: isExempt,
      };
    }

    // CDI + spread (ex: "CDI + 2%")
    const cdiSpreadMatch = combined.match(/CDI\s*\+\s*([\d.,]+)\s*%?/);
    if (cdiSpreadMatch && cdiSpreadMatch[1]) {
      const spread = parseFloat(cdiSpreadMatch[1].replace(",", "."));
      return {
        indexType: "CDI",
        rateValue: 100,
        spread: isNaN(spread) ? 0 : spread,
        label: `100% CDI + ${spread.toFixed(2)}%`,
        isExemptFromIR: isExempt,
      };
    }

    return {
      indexType: "CDI",
      rateValue: 100,
      spread: 0,
      label: "100% CDI",
      isExemptFromIR: isExempt,
    };
  }

  // 3. Selic (ex: "TESOURO SELIC", "SELIC + 0.1%")
  if (combined.includes("SELIC")) {
    const selicSpreadMatch = combined.match(/SELIC\s*\+\s*([\d.,]+)\s*%?/);
    let spread = 0;
    if (selicSpreadMatch && selicSpreadMatch[1]) {
      spread = parseFloat(selicSpreadMatch[1].replace(",", "."));
    }
    return {
      indexType: "SELIC",
      rateValue: 100,
      spread: isNaN(spread) ? 0 : spread,
      label: spread > 0 ? `Selic + ${spread.toFixed(2)}%` : "100% Selic",
      isExemptFromIR: isExempt,
    };
  }

  // 4. Poupança
  if (combined.includes("POUPANÇA") || combined.includes("POUPANCA")) {
    return {
      indexType: "POUPANCA",
      rateValue: 100,
      spread: 0,
      label: "Poupança",
      isExemptFromIR: true,
    };
  }

  // 5. Prefixado (ex: "12% A.A.", "13,5% AO ANO", "11.8%")
  const preMatch = combined.match(/([\d.,]+)\s*%\s*(?:A\.?A\.?|AO\s*ANO)?/);
  if (preMatch && preMatch[1]) {
    const rate = parseFloat(preMatch[1].replace(",", "."));
    if (!isNaN(rate) && rate > 0) {
      return {
        indexType: "PREFIXED",
        rateValue: rate,
        spread: 0,
        label: `${rate.toFixed(2)}% a.a.`,
        isExemptFromIR: isExempt,
      };
    }
  }

  // Fallback padrão seguro: 100% CDI
  return {
    indexType: "CDI",
    rateValue: 100,
    spread: 0,
    label: "100% CDI",
    isExemptFromIR: isExempt,
  };
}

/**
 * Calcula quantidade aproximada de dias úteis entre duas datas (desconsiderando fins de semana)
 */
export function countBusinessDays(startDate: Date, endDate: Date): number {
  if (startDate >= endDate) return 0;

  let count = 0;
  const cur = new Date(startDate);
  // normaliza para meia-noite
  cur.setHours(0, 0, 0, 0);
  const target = new Date(endDate);
  target.setHours(0, 0, 0, 0);

  while (cur < target) {
    cur.setDate(cur.getDate() + 1);
    const dayOfWeek = cur.getDay();
    // 0 = Domingo, 6 = Sábado
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
  }

  return count;
}

/**
 * Alíquota da tabela regressiva de IR de Renda Fixa no Brasil
 */
export function getIRRate(calendarDays: number, isExempt: boolean): number {
  if (isExempt) return 0;
  if (calendarDays <= 180) return 22.5;
  if (calendarDays <= 360) return 20.0;
  if (calendarDays <= 720) return 17.5;
  return 15.0;
}

/**
 * Calcula o rendimento de um título de renda fixa desde a data inicial até hoje
 */
export function calculateFixedIncomeYield(params: {
  initialAmount: number;
  startDate: string | Date;
  rawRate?: string | null;
  assetName?: string | null;
  category?: string | null;
  dueDate?: string | null;
  marketRates?: Partial<MarketRates>;
  targetDate?: Date;
}): FixedIncomeCalculationResult {
  const {
    initialAmount,
    startDate: rawStartDate,
    rawRate,
    assetName,
    category,
    dueDate: rawDueDate,
    marketRates = {},
    targetDate = new Date(),
  } = params;

  const rates: MarketRates = {
    ...DEFAULT_MARKET_RATES,
    ...marketRates,
  };

  const parsedRate = parseFixedIncomeRate(rawRate, assetName, category);
  const start = new Date(rawStartDate);
  const now = new Date(targetDate);
  const due = rawDueDate ? new Date(rawDueDate) : undefined;

  // Se já venceu, o cálculo de juros para na data de vencimento
  const calculationEnd = due && due < now ? due : now;
  const isExpired = due ? due < now : false;

  // Dias corridos e úteis
  const diffTime = Math.max(0, calculationEnd.getTime() - start.getTime());
  const calendarDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const businessDays = countBusinessDays(start, calculationEnd);

  // 1. Determina a taxa anual nominal correspondente
  let annualRate = 0;
  switch (parsedRate.indexType) {
    case "CDI":
      // (rateValue% do CDI) + spread
      annualRate = (rates.cdiAnnual * (parsedRate.rateValue / 100)) + parsedRate.spread;
      break;
    case "IPCA":
      // IPCA + cupom: (1 + IPCA) * (1 + spread) - 1
      annualRate = ((1 + rates.ipcaAnnual / 100) * (1 + parsedRate.spread / 100) - 1) * 100;
      break;
    case "SELIC":
      annualRate = (rates.selicAnnual * (parsedRate.rateValue / 100)) + parsedRate.spread;
      break;
    case "POUPANCA":
      annualRate = rates.poupancaAnnual;
      break;
    case "PREFIXED":
      annualRate = parsedRate.rateValue;
      break;
  }

  // 2. Taxa diária exponencial base 252 dias úteis
  const dailyRate = Math.pow(1 + annualRate / 100, 1 / 252) - 1;

  // 3. Fator acumulado
  const compoundFactor = Math.pow(1 + dailyRate, businessDays);

  // 4. Saldo bruto atualizado e juros brutos
  const currentGrossAmount = Number((initialAmount * compoundFactor).toFixed(2));
  const accruedInterest = Number(Math.max(0, currentGrossAmount - initialAmount).toFixed(2));

  // 5. Rentabilidade percentual acumulada
  const profitabilityPercent = initialAmount > 0
    ? Number(((accruedInterest / initialAmount) * 100).toFixed(2))
    : 0;

  // 6. Imposto de renda (tabela regressiva)
  const irRatePercent = getIRRate(calendarDays, parsedRate.isExemptFromIR);
  const irAmount = Number(((accruedInterest * irRatePercent) / 100).toFixed(2));
  const currentNetAmount = Number((currentGrossAmount - irAmount).toFixed(2));
  const netInterest = Number((accruedInterest - irAmount).toFixed(2));

  return {
    initialAmount,
    currentGrossAmount,
    accruedInterest,
    profitabilityPercent,
    annualizedRatePercent: Number(annualRate.toFixed(2)),
    businessDays,
    calendarDays,
    irRatePercent,
    irAmount,
    currentNetAmount,
    netInterest,
    parsedRate,
    startDate: typeof rawStartDate === "string" ? rawStartDate : rawStartDate.toISOString().split("T")[0],
    dueDate: rawDueDate || undefined,
    isExpired,
  };
}

/**
 * Simula a evolução futura da renda fixa dado um valor inicial, prazo em meses e taxa
 */
export function simulateFixedIncomeGrowth(
  amount: number,
  months: number,
  parsedRate: ParsedRate,
  marketRates: MarketRates = DEFAULT_MARKET_RATES
): {
  month: number;
  grossAmount: number;
  interest: number;
  netAmount: number;
}[] {
  let annualRate = 0;
  switch (parsedRate.indexType) {
    case "CDI":
      annualRate = (marketRates.cdiAnnual * (parsedRate.rateValue / 100)) + parsedRate.spread;
      break;
    case "IPCA":
      annualRate = ((1 + marketRates.ipcaAnnual / 100) * (1 + parsedRate.spread / 100) - 1) * 100;
      break;
    case "SELIC":
      annualRate = (marketRates.selicAnnual * (parsedRate.rateValue / 100)) + parsedRate.spread;
      break;
    case "POUPANCA":
      annualRate = marketRates.poupancaAnnual;
      break;
    case "PREFIXED":
      annualRate = parsedRate.rateValue;
      break;
  }

  const monthlyRate = Math.pow(1 + annualRate / 100, 1 / 12) - 1;
  const results = [];

  for (let m = 1; m <= months; m++) {
    const gross = amount * Math.pow(1 + monthlyRate, m);
    const interest = gross - amount;
    const days = m * 30;
    const irRate = getIRRate(days, parsedRate.isExemptFromIR);
    const ir = (interest * irRate) / 100;
    const net = gross - ir;

    results.push({
      month: m,
      grossAmount: Number(gross.toFixed(2)),
      interest: Number(interest.toFixed(2)),
      netAmount: Number(net.toFixed(2)),
    });
  }

  return results;
}
