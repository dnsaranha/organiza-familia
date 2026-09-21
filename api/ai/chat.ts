import type { VercelRequest, VercelResponse } from '@vercel/node';
import { processAIChat } from '../../src/server/geminiHandler';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-client-info, apikey');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await processAIChat(req.body);
    return res.status(200).json(result);
  } catch (err: any) {
    console.error('[Vercel AI Handler] Error:', err?.message || err);
    return res.status(200).json({
      reply: 'Olá! Nossos servidores de IA estão momentaneamente ocupados. Suas informações continuam salvas e você pode registrar receitas, despesas e metas diretamente no Organiza.',
      modelUsed: 'gemini-fallback',
      usage: { promptTokens: 0, responseTokens: 0, totalTokens: 0, costUsd: 0, costBrl: 0 },
    });
  }
}
