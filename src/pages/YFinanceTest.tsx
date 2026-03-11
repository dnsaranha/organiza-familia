import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Search, TrendingUp, DollarSign, BarChart3 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface AssetData {
  ticker: string;
  name: string | null;
  current_price: number | null;
  dividends_12m: number | null;
  sector: string | null;
  price_history: any[];
  dividend_history: any[];
}

interface QuoteData {
  symbol: string;
  name: string;
  regularMarketPrice: number;
  regularMarketChangePercent: number;
}

const YFinanceTest = () => {
  const [ticker, setTicker] = useState("");
  const [period, setPeriod] = useState("6mo");
  const [loading, setLoading] = useState(false);
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);
  const [dbAsset, setDbAsset] = useState<AssetData | null>(null);
  const [edgeFunctionResult, setEdgeFunctionResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!ticker.trim()) return;

    setLoading(true);
    setError(null);
    setQuoteData(null);
    setDbAsset(null);
    setEdgeFunctionResult(null);

    const formattedTicker = ticker.toUpperCase().trim();
    const yahooTicker = formattedTicker.match(/^[A-Z]{4}\d{1,2}$/)
      ? `${formattedTicker}.SA`
      : formattedTicker;

    try {
      // 1. Fetch quote from b3-quotes edge function
      const quotePromise = supabase.functions.invoke("b3-quotes", {
        body: { symbols: [yahooTicker] },
      });

      // 2. Fetch from financial_assets table (cached data)
      const dbPromise = supabase
        .from("financial_assets")
        .select("*")
        .eq("ticker", yahooTicker)
        .maybeSingle();

      // 3. Fetch from yfinance-data edge function with period
      const yfinancePromise = supabase.functions.invoke("yfinance-data", {
        body: { tickers: [yahooTicker] },
      });

      const [quoteResult, dbResult, yfinanceResult] = await Promise.all([
        quotePromise,
        dbPromise,
        yfinancePromise,
      ]);

      if (quoteResult.data?.quotes?.[0]) {
        setQuoteData(quoteResult.data.quotes[0]);
      }

      if (dbResult.data) {
        setDbAsset(dbResult.data as AssetData);
      }

      if (yfinanceResult.data) {
        setEdgeFunctionResult(yfinanceResult.data);
      }

      if (quoteResult.error && dbResult.error && yfinanceResult.error) {
        setError("Nenhuma fonte retornou dados para este ativo.");
      }
    } catch (err) {
      console.error("Erro no teste:", err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number | null) =>
    value != null
      ? value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
      : "—";

  const formatPercent = (value: number | null) =>
    value != null ? `${value >= 0 ? "+" : ""}${value.toFixed(2)}%` : "—";

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Teste de Integração — Yahoo Finance / B3
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Digite o ticker de um ativo (ex: PETR4, VALE3, ITUB4) e selecione o
            período para buscar dados de cotação, histórico de preços e
            dividendos.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Ex: PETR4, VALE3, BBDC4"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1"
            />
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1mo">1 Mês</SelectItem>
                <SelectItem value="3mo">3 Meses</SelectItem>
                <SelectItem value="6mo">6 Meses</SelectItem>
                <SelectItem value="1y">1 Ano</SelectItem>
                <SelectItem value="2y">2 Anos</SelectItem>
                <SelectItem value="5y">5 Anos</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSearch} disabled={loading || !ticker.trim()}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Buscar
            </Button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quote Data */}
      {quoteData && (
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Cotação em Tempo Real
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Ticker</p>
                <p className="font-bold text-lg">{quoteData.symbol}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Nome</p>
                <p className="font-medium text-sm">{quoteData.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Preço Atual</p>
                <p className="font-bold text-lg">
                  {formatCurrency(quoteData.regularMarketPrice)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Variação</p>
                <p
                  className={`font-bold text-lg ${quoteData.regularMarketChangePercent >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {formatPercent(quoteData.regularMarketChangePercent)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* DB Cached Data */}
      {dbAsset && (
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Dados do Banco (Cache)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-xs text-muted-foreground">Nome</p>
                <p className="font-medium">{dbAsset.name || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Setor</p>
                <Badge variant="secondary">{dbAsset.sector || "—"}</Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Preço (cache)</p>
                <p className="font-bold">
                  {formatCurrency(dbAsset.current_price)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Dividendos 12M</p>
                <p className="font-bold">
                  {formatCurrency(dbAsset.dividends_12m)}
                </p>
              </div>
            </div>

            {/* Price History Table */}
            {Array.isArray(dbAsset.price_history) &&
              dbAsset.price_history.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-1">
                    <BarChart3 className="h-4 w-4" /> Histórico de Preços (
                    {dbAsset.price_history.length} registros)
                  </h4>
                  <div className="max-h-60 overflow-y-auto border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead className="text-right">
                            Abertura
                          </TableHead>
                          <TableHead className="text-right">
                            Fechamento
                          </TableHead>
                          <TableHead className="text-right">Máxima</TableHead>
                          <TableHead className="text-right">Mínima</TableHead>
                          <TableHead className="text-right">Volume</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dbAsset.price_history
                          .slice(-20)
                          .reverse()
                          .map((entry: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell className="text-xs">
                                {entry.date
                                  ? new Date(entry.date).toLocaleDateString(
                                      "pt-BR",
                                    )
                                  : "—"}
                              </TableCell>
                              <TableCell className="text-right text-xs">
                                {formatCurrency(entry.open)}
                              </TableCell>
                              <TableCell className="text-right text-xs">
                                {formatCurrency(entry.close)}
                              </TableCell>
                              <TableCell className="text-right text-xs">
                                {formatCurrency(entry.high)}
                              </TableCell>
                              <TableCell className="text-right text-xs">
                                {formatCurrency(entry.low)}
                              </TableCell>
                              <TableCell className="text-right text-xs">
                                {entry.volume?.toLocaleString("pt-BR") || "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

            {/* Dividend History */}
            {Array.isArray(dbAsset.dividend_history) &&
              dbAsset.dividend_history.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold text-sm mb-2">
                    Histórico de Dividendos (
                    {dbAsset.dividend_history.length} registros)
                  </h4>
                  <div className="max-h-40 overflow-y-auto border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dbAsset.dividend_history
                          .slice(-20)
                          .reverse()
                          .map((entry: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell className="text-xs">
                                {entry.date
                                  ? new Date(entry.date).toLocaleDateString(
                                      "pt-BR",
                                    )
                                  : "—"}
                              </TableCell>
                              <TableCell className="text-right text-xs font-medium">
                                {formatCurrency(entry.amount)}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
          </CardContent>
        </Card>
      )}

      {/* Edge Function Raw Result */}
      {edgeFunctionResult && (
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              Resultado da Edge Function (yfinance-data)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-md max-h-80 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-xs">
                {JSON.stringify(edgeFunctionResult, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No results */}
      {!loading && !quoteData && !dbAsset && !edgeFunctionResult && !error && ticker && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Clique em "Buscar" para carregar os dados do ativo.
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default YFinanceTest;
