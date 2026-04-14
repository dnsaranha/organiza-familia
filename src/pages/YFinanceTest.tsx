import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

const YFinanceTest = () => {
  const [ticker, setTicker] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchAssetData = async (symbol: string) => {
    let periodStart;
    let periodEnd;

    if (startDate) {
      // Treat as local date, then get timestamp in seconds
      periodStart = Math.floor(new Date(`${startDate}T00:00:00`).getTime() / 1000);
    }

    if (endDate) {
      // Treat as local date end of day
      periodEnd = Math.floor(new Date(`${endDate}T23:59:59`).getTime() / 1000);
    }

    const payload = {
      tickers: [symbol],
      fullHistory: true,
      periodStart,
      periodEnd,
    };

    const { data, error } = await supabase.functions.invoke("yfinance-data", {
      body: payload,
    });

    if (error) {
      throw error;
    }

    return data;
  };

  const handleSearch = async () => {
    if (!ticker) return;

    setLoading(true);
    setTestResult(null);

    const formattedTicker = ticker.trim().toUpperCase();

    try {
      let data = await fetchAssetData(formattedTicker);

      // Retry logic for Brazilian tickers
      if (
        (!data || !data.assets || data.assets.length === 0) &&
        !formattedTicker.endsWith(".SA")
      ) {
        console.log(`Tentando novamente com o sufixo .SA para ${formattedTicker}`);
        data = await fetchAssetData(`${formattedTicker}.SA`);
      }

      if (data && data.assets && data.assets.length > 0) {
        setTestResult(data.assets[0]);
      } else {
        setTestResult({ error: `Nenhum dado encontrado para o ticker ${formattedTicker}` });
      }
    } catch (error) {
      console.error("Erro na busca:", error);
      setTestResult({ error: (error as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Rastreador de Ativos - Yahoo Finance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-6 text-muted-foreground">
            Ferramenta de consulta rápida para o histórico completo de dividendos e preços de um ativo.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="space-y-2">
              <Label htmlFor="ticker">Ativo (Ticker)</Label>
              <Input
                id="ticker"
                placeholder="Ex: PETR4 ou AAPL"
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Data de Início</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Data de Término</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <Button onClick={handleSearch} disabled={loading || !ticker}>
            {loading ? "Buscando..." : "Buscar Ativo"}
          </Button>

          {testResult && !testResult.error && (
            <div className="mt-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Nome do Ativo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold truncate" title={testResult.nome}>{testResult.nome}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Ticker</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{testResult.ticker}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Preço Atual</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(testResult.preco_atual)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total de Dividendos Acumulados</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(
                        testResult.historico_dividendos?.reduce(
                          (sum: number, div: any) => sum + (div.amount || 0),
                          0
                        ) || 0
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {testResult.historico_precos && testResult.historico_precos.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Gráfico de Preços</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={testResult.historico_precos} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <Line type="monotone" dataKey="close" stroke="#8884d8" dot={false} strokeWidth={2} />
                        <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(date) => {
                            const d = new Date(date);
                            return `${d.getMonth() + 1}/${d.getFullYear()}`;
                          }}
                        />
                        <YAxis domain={['auto', 'auto']} tickFormatter={(val) => formatCurrency(val)} />
                        <Tooltip
                          labelFormatter={(label) => new Date(label).toLocaleDateString()}
                          formatter={(value: number) => [formatCurrency(value), "Preço"]}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {testResult.historico_dividendos && testResult.historico_dividendos.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Histórico de Dividendos ({testResult.historico_dividendos.length} eventos)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-[400px] overflow-y-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs uppercase bg-muted sticky top-0">
                          <tr>
                            <th className="px-4 py-3">Data</th>
                            <th className="px-4 py-3 text-right">Valor por Cota</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...testResult.historico_dividendos].reverse().map((div: any, i: number) => (
                            <tr key={i} className="border-b">
                              <td className="px-4 py-3 font-medium">
                                {new Date(div.date).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3 text-right text-green-600 font-medium">
                                {formatCurrency(div.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {testResult && testResult.error && (
            <div className="mt-8 p-4 bg-red-50 text-red-700 rounded-md">
              <h3 className="font-bold">Erro:</h3>
              <p>{testResult.error}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default YFinanceTest;
