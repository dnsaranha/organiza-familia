// 1. Estrutura JSON de mapeamento Pluggy → Português
export const investmentMapping = [
  {
    type: "FIXED_INCOME",
    label_pt: "Renda Fixa",
    subtypes: [
      { subtype: "CRI", label_pt: "CRI", descricao_pt: "Certificado de Recebíveis Imobiliários – título do setor imobiliário" },
      { subtype: "CRA", label_pt: "CRA", descricao_pt: "Certificado de Recebíveis do Agronegócio" },
      { subtype: "LCI", label_pt: "LCI", descricao_pt: "Letra de Crédito Imobiliário – isenta de IR" },
      { subtype: "LCA", label_pt: "LCA", descricao_pt: "Letra de Crédito do Agronegócio – isenta de IR" },
      { subtype: "LC", label_pt: "Letra de Câmbio", descricao_pt: "Título emitido por financeiras, semelhante ao CDB" },
      { subtype: "TREASURY", label_pt: "Tesouro Direto", descricao_pt: "Títulos públicos emitidos pelo governo federal" },
      { subtype: "DEBENTURES", label_pt: "Debêntures", descricao_pt: "Títulos de dívida emitidos por empresas" },
      { subtype: "CDB", label_pt: "CDB", descricao_pt: "Certificado de Depósito Bancário" },
      { subtype: "LIG", label_pt: "LIG", descricao_pt: "Letra Imobiliária Garantida" },
      { subtype: "LF", label_pt: "Letra Financeira", descricao_pt: "Título de longo prazo emitido por bancos" }
    ]
  },
  {
    type: "SECURITY",
    label_pt: "Previdência",
    subtypes: [
      { subtype: "RETIREMENT", label_pt: "Previdência Privada", descricao_pt: "Produto de previdência privada em geral" },
      { subtype: "PGBL", label_pt: "PGBL", descricao_pt: "Plano Gerador de Benefício Livre – dedutível no IR" },
      { subtype: "VGBL", label_pt: "VGBL", descricao_pt: "Vida Gerador de Benefício Livre – indicado para declaração simplificada" }
    ]
  },
  {
    type: "MUTUAL_FUND",
    label_pt: "Fundos de Investimento",
    subtypes: [
      { subtype: "INVESTMENT_FUND", label_pt: "Fundo de Investimento", descricao_pt: "Fundo de investimento geral" },
      { subtype: "STOCK_FUND", label_pt: "Fundo de Ações", descricao_pt: "Investe em ações de empresas" },
      { subtype: "MULTIMARKET_FUND", label_pt: "Fundo Multimercado", descricao_pt: "Mistura ações, câmbio e renda fixa" },
      { subtype: "EXCHANGE_FUND", label_pt: "Fundo Cambial", descricao_pt: "Focado em moedas estrangeiras" },
      { subtype: "FIXED_INCOME_FUND", label_pt: "Fundo de Renda Fixa", descricao_pt: "Investe em títulos de renda fixa" },
      { subtype: "FIP_FUND", label_pt: "FIP", descricao_pt: "Fundo de Investimento em Participações" },
      { subtype: "OFFSHORE_FUND", label_pt: "Fundo Offshore", descricao_pt: "Fundos registrados no exterior" },
      { subtype: "ETF_FUND", label_pt: "Fundo de Índice (ETF)", descricao_pt: "Fundo de índice negociado em bolsa" }
    ]
  },
  {
    type: "EQUITY",
    label_pt: "Renda Variável",
    subtypes: [
      { subtype: "STOCK", label_pt: "Ação", descricao_pt: "Papel de empresa listada em bolsa" },
      { subtype: "BDR", label_pt: "BDR", descricao_pt: "Recibo de ações de empresas estrangeiras" },
      { subtype: "REAL_ESTATE_FUND", label_pt: "Fundo Imobiliário (FII)", descricao_pt: "Investe em imóveis ou títulos imobiliários" },
      { subtype: "DERIVATIVES", label_pt: "Derivativos", descricao_pt: "Contratos financeiros atrelados a ativos" },
      { subtype: "OPTION", label_pt: "Opção", descricao_pt: "Contrato de direito de compra/venda futura" }
    ]
  },
  {
    type: "ETF",
    label_pt: "ETF",
    subtypes: [
      { subtype: "ETF", label_pt: "ETF", descricao_pt: "Fundo de índice negociado em bolsa" }
    ]
  },
  {
    type: "COE",
    label_pt: "COE",
    subtypes: [
      { subtype: "STRUCTURED_NOTE", label_pt: "COE", descricao_pt: "Certificado de Operações Estruturadas" }
    ]
  },
  {
    type: "manual",
    label_pt: "Manual",
    subtypes: [
      { subtype: "ACAO", label_pt: "Ação", descricao_pt: "Ação adicionada manualmente" },
      { subtype: "FII", label_pt: "FII", descricao_pt: "Fundo Imobiliário adicionado manualmente" },
      { subtype: "ETF", label_pt: "ETF", descricao_pt: "ETF adicionado manualmente" },
      { subtype: "RENDA_FIXA", label_pt: "Renda Fixa", descricao_pt: "Renda Fixa adicionada manualmente" },
      { subtype: "FUNDO", label_pt: "Fundo", descricao_pt: "Fundo adicionado manualmente" },
      { subtype: "CRIPTO", label_pt: "Cripto", descricao_pt: "Criptomoeda adicionada manualmente" },
      { subtype: "OUTRO", label_pt: "Outro", descricao_pt: "Investimento manual" }
    ]
  }
];

// 2. Função para mapear Pluggy → Português
export function mapInvestmentType(type: string, subtype: string | null) {
  const normalizedType = type.toUpperCase();
  const normalizedSubtype = subtype ? subtype.toUpperCase() : null;

  const typeData = investmentMapping.find(t => t.type.toUpperCase() === normalizedType);
  if (!typeData) return { label_pt: type, descricao_pt: "" };

  if (!normalizedSubtype) return { label_pt: typeData.label_pt, descricao_pt: "" };

  const subtypeData = typeData.subtypes.find(s => s.subtype.toUpperCase() === normalizedSubtype);
  return subtypeData ? { label_pt: subtypeData.label_pt, descricao_pt: subtypeData.descricao_pt } : { label_pt: typeData.label_pt, descricao_pt: "" };
}
