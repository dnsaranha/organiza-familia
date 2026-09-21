import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const USD_BRL_RATE = 5.60;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const data = await req.json();
    const apiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_AI_API_KEY");

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          reply: "Olá! O assistente está temporariamente em manutenção. Suas finanças continuam seguras e você pode usar todas as ferramentas do Organiza normalmente.",
          modelUsed: "edge-fallback",
          usage: { promptTokens: 0, responseTokens: 0, totalTokens: 0, costUsd: 0, costBrl: 0 },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const calib = data.calibrationSettings || {};
    const tone = calib.tone || "analítico, consultivo, acolhedor e focado em finanças familiares e investimentos";
    const customPrompt =
      calib.system_prompt ||
      "Você é o Analista Financeiro Pessoal do usuário no Organiza, especialista em finanças familiares e investimentos.";
    const knowledge = calib.knowledge_base || "";
    const disclaimer =
      calib.disclaimer ||
      "As orientações têm finalidade educativa e informativa, não constituindo recomendação formal nos termos da CVM.";
    const maxTokens = calib.max_output_tokens || 800;

    let financialContext = "";
    if (data.financialSummary) {
      const fs = data.financialSummary;
      const lines: string[] = [];
      lines.push("\n[DADOS REAIS DO USUÁRIO - PAINEL DO ANALISTA FINANCEIRO PESSOAL]:");
      if (fs.monthlyIncome !== undefined) lines.push(`• Receitas do Mês: R$ ${Number(fs.monthlyIncome).toFixed(2)}`);
      if (fs.monthlyExpenses !== undefined) lines.push(`• Despesas Totais do Mês: R$ ${Number(fs.monthlyExpenses).toFixed(2)}`);
      if (fs.balance !== undefined) lines.push(`• Saldo Líquido do Mês: R$ ${Number(fs.balance).toFixed(2)}`);
      if (fs.savingsRate !== undefined) lines.push(`• Taxa de Poupança: ${Number(fs.savingsRate).toFixed(1)}%`);
      if (fs.totalInvested !== undefined) lines.push(`• Patrimônio Total Investido: R$ ${Number(fs.totalInvested).toFixed(2)}`);
      financialContext = lines.join("\n");
    }

    const todayDate = new Date().toISOString().split("T")[0];
    const systemInstruction = `${customPrompt}

TOM DE VOZ: ${tone}.
BASE DE CONHECIMENTO DO APP ORGANIZA:
${knowledge}

DIRETRIZES DO ANALISTA FINANCEIRO PESSOAL:
1. Responda em Português do Brasil com linguagem clara, empática e objetiva.
2. Utilize os dados reais de receitas, despesas e investimentos para dar respostas analíticas.
3. Formate com tópicos e negrito para leitura ágil.
4. Avisos legais sobre CVM (${disclaimer}) somente quando houver consulta explícita sobre compra/venda de ativos específicos.
${financialContext}`;

    const userMessage = data.message || "Olá";

    // Direct Gemini REST API call (compatible with Deno Edge Functions)
    const model = "gemini-2.5-flash";
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemInstruction }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: userMessage }],
          },
        ],
        generationConfig: {
          maxOutputTokens: maxTokens,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[Edge AI] Gemini API error:", response.status, errText);
      throw new Error(`Gemini API returned ${response.status}`);
    }

    const result = await response.json();
    const replyText =
      result?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Olá! Como posso te ajudar com as finanças da sua família hoje?";

    const promptTokens = result?.usageMetadata?.promptTokenCount || 500;
    const responseTokens = result?.usageMetadata?.candidatesTokenCount || 100;
    const totalTokens = promptTokens + responseTokens;
    const costUsd = Number(((promptTokens * 0.075 + responseTokens * 0.3) / 1000000).toFixed(6));
    const costBrl = Number((costUsd * USD_BRL_RATE).toFixed(6));

    return new Response(
      JSON.stringify({
        reply: replyText,
        modelUsed: model,
        usage: {
          promptTokens,
          responseTokens,
          totalTokens,
          costUsd,
          costBrl,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[Edge AI] Error:", error.message || error);
    return new Response(
      JSON.stringify({
        reply: "Olá! O assistente está momentaneamente ocupado. Você pode continuar registrando suas transações e metas normalmente no Organiza.",
        modelUsed: "gemini-fallback",
        usage: { promptTokens: 0, responseTokens: 0, totalTokens: 0, costUsd: 0, costBrl: 0 },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
