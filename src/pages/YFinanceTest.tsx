import React, { useEffect, useState, useMemo } from "react";
import {
  fetchDirectYahooData,
  fetchMultipleAssetsDirectly,
  formatTickerForYahoo,
  DirectAssetData,
  DirectDividendEvent,
} from "@/lib/b3/marketData";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  RefreshCw,
  Database,
  Calendar,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  ArrowUpDown,
} from "lucide-react";

const POPULAR_TICKERS = [
  "ITUB4",
  "BBDC4",
  "BBAS3",
  "PETR4",
  "VALE3",
  "MXRF11",
  "HGLG11",
  "XPML11",
  "KNCR11",
  "TAEE11",
];

const YFinanceTest = () => {
  const { toast } = useToast();
  const [tickerInput, setTickerInput] = useState("ITUB4");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeViewTab, setActiveViewTab] = useState("august");
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>("08"); // 08 = Agosto
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>("ALL");

  // Results state
  const [singleResult, setSingleResult] = useState<DirectAssetData | null>(null);
  const [portfolioResults, setPortfolioResults] = useState<DirectAssetData[]>([]);
  const [userTickers, setUserTickers] = useState<string[]>([]);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string | null>(null);
  const [rawPayload, setRawPayload] = useState<any>(null);

  // Load user's portfolio tickers from database on mount
  useEffect(() => {
    const loadUserTickers = async () => {
      try {
        const { data: txs } = await supabase
          .from("investment_transactions")
          .select("ticker");

        if (txs && txs.length > 0) {
          const unique = [
            ...new Set(
              txs
                .map((t) => t.ticker?.replace(".SA", "").toUpperCase().trim())
                .filter(Boolean)
            ),
          ];
          if (unique.length > 0) {
            setUserTickers(unique as string[]);
          }
        }
      } catch (err) {
        console.warn("Aviso ao carregar tickers do usuário:", err);
      }
    };

    loadUserTickers();
  }, []);

  // Search a single ticker directly
  const handleSearchSingle = async (symbolToSearch?: string) => {
    const sym = (symbolToSearch || tickerInput).trim().toUpperCase();
    if (!sym) return;

    setLoading(true);
    try {
      const data = await fetchDirectYahooData(sym, true);
      setSingleResult(data);
      setRawPayload(data);
      setLastUpdatedTime(new Date().toLocaleTimeString("pt-BR"));

      if (!data) {
        toast({
          title: `Nenhum dado encontrado para ${sym}`,
          description: "Verifique se o código do ativo está correto na B3.",
          variant: "destructive",
        });
      } else {
        toast({
          title: `Dados carregados para ${sym}`,
          description: `Preço: R$ ${data.preco_atual.toFixed(2)} | Proventos: ${data.historico_dividendos.length} eventos`,
        });
      }
    } catch (err: any) {
      toast({
        title: "Erro na busca direta",
        description: err.message || "Falha ao consultar Yahoo Finance",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Search all user's portfolio tickers in batch
  const handleSearchPortfolio = async () => {
    const targetList = userTickers.length > 0 ? userTickers : POPULAR_TICKERS.slice(0, 6);
    setLoading(true);
    try {
      const results = await fetchMultipleAssetsDirectly(targetList, true);
      setPortfolioResults(results);
      setRawPayload(results);
      setLastUpdatedTime(new Date().toLocaleTimeString("pt-BR"));

      toast({
        title: "Busca em lote concluída",
        description: `${results.length} ativos consultados diretamente.`,
      });
    } catch (err: any) {
      toast({
        title: "Erro ao consultar carteira",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Save current fetched data directly into Supabase database (financial_assets)
  const handleSaveToDatabase = async (assetsToSave: DirectAssetData[]) => {
    if (!assetsToSave || assetsToSave.length === 0) {
      toast({
        title: "Nenhum dado para salvar",
        description: "Execute uma busca primeiro.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const rows = assetsToSave.map((asset) => ({
        ticker: asset.ticker,
        name: asset.nome,
        sector: asset.setor,
        current_price: asset.preco_atual,
        dividends_12m: asset.dividendos_12m,
        price_history: asset.historico_precos || [],
        dividend_history: asset.historico_dividendos || [],
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("financial_assets")
        .upsert(rows, { onConflict: "ticker" });

      if (error) throw error;

      toast({
        title: "Salvo no banco com sucesso!",
        description: `${rows.length} ativo(s) gravado(s) na tabela financial_assets.`,
      });
    } catch (err: any) {
      toast({
        title: "Erro ao salvar no banco",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Combine single and portfolio results for inspection
  const allCurrentAssets = useMemo(() => {
    const map = new Map<string, DirectAssetData>();
    if (singleResult) map.set(singleResult.ticker, singleResult);
    for (const a of portfolioResults) map.set(a.ticker, a);
    return Array.from(map.values());
  }, [singleResult, portfolioResults]);

  // Extract all dividend events with asset info
  const allDividendRows = useMemo(() => {
    const list: Array<{
      ticker: string;
      nome: string;
      date: string;
      recordDate?: string;
      amount: number;
      type?: string;
      year: string;
      month: string;
      isAugust: boolean;
    }> = [];

    for (const asset of allCurrentAssets) {
      for (const div of asset.historico_dividendos || []) {
        const dStr = div.date || div.paymentDate || div.recordDate || "";
        const parts = dStr.split("-");
        const year = parts[0] || "";
        const month = parts[1] || "";
        list.push({
          ticker: asset.ticker.replace(".SA", ""),
          nome: asset.nome,
          date: dStr,
          recordDate: div.recordDate,
          amount: div.amount,
          type: div.type || (asset.ticker.includes("11") ? "RENDIMENTO" : "DIVIDENDO"),
          year,
          month,
          isAugust: month === "08",
        });
      }
    }

    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [allCurrentAssets]);

  // August events specifically
  const augustDividends = useMemo(() => {
    return allDividendRows.filter((d) => {
      if (selectedYearFilter === "ALL") return d.month === "08";
      return d.month === "08" && d.year === selectedYearFilter;
    });
  }, [allDividendRows, selectedYearFilter]);

  // Filtered general events
  const filteredDividends = useMemo(() => {
    return allDividendRows.filter((d) => {
      const matchMonth =
        selectedMonthFilter === "ALL" ? true : d.month === selectedMonthFilter;
      const matchYear =
        selectedYearFilter === "ALL" ? true : d.year === selectedYearFilter;
      return matchMonth && matchYear;
    });
  }, [allDividendRows, selectedMonthFilter, selectedYearFilter]);

  // Distinct available years in the dataset
  const availableYears = useMemo(() => {
    const set = new Set(allDividendRows.map((d) => d.year).filter(Boolean));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [allDividendRows]);

  return (
    <div id="yfinance-diagnostic-page" className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header Card */}
      <Card id="yfinance-header-card" className="border-border">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-xl md:text-2xl font-bold flex items-center gap-2">
                <Search className="w-5 h-5 text-primary" />
                Painel de Teste e Inspeção - Yahoo Finance
              </CardTitle>
              <CardDescription className="text-sm mt-1">
                Consulte em tempo real as cotações e o histórico de proventos direto da fonte e veja exatamente o que é gravado no banco de dados.
              </CardDescription>
            </div>

            {lastUpdatedTime && (
              <Badge variant="outline" className="self-start sm:self-auto py-1 px-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                Última consulta: {lastUpdatedTime}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Query Bar */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Input
                id="input-ticker-search"
                value={tickerInput}
                onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
                placeholder="Digite o código (ex: ITUB4, PETR4, MXRF11, BBAS3, VALE3)..."
                className="font-mono uppercase font-semibold pr-10"
                onKeyDown={(e) => e.key === "Enter" && handleSearchSingle()}
              />
            </div>

            <Button
              id="btn-search-single"
              onClick={() => handleSearchSingle()}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Consultar Ativo
            </Button>

            <Button
              id="btn-search-portfolio"
              variant="secondary"
              onClick={handleSearchPortfolio}
              disabled={loading}
              className="gap-2"
            >
              <Layers className="w-4 h-4" />
              Consultar Carteira ({userTickers.length > 0 ? userTickers.length : 6} ativos)
            </Button>
          </div>

          {/* Quick Click Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-xs text-muted-foreground mr-1">Atalhos rápidos:</span>
            {POPULAR_TICKERS.map((sym) => (
              <button
                key={sym}
                id={`chip-${sym}`}
                type="button"
                onClick={() => {
                  setTickerInput(sym);
                  handleSearchSingle(sym);
                }}
                className={`text-xs font-mono font-medium px-2.5 py-1 rounded-md border transition-colors ${
                  tickerInput === sym
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/60 hover:bg-muted text-foreground border-border"
                }`}
              >
                {sym}
              </button>
            ))}
          </div>

          {/* Portfolio Tickers Info */}
          {userTickers.length > 0 && (
            <div className="text-xs bg-muted/40 p-2.5 rounded-md border border-border flex flex-wrap items-center gap-1.5">
              <span className="font-semibold text-muted-foreground">Tickers da sua carteira:</span>
              {userTickers.map((t) => (
                <Badge
                  key={t}
                  variant="secondary"
                  className="cursor-pointer hover:bg-primary/20 text-xs font-mono"
                  onClick={() => {
                    setTickerInput(t);
                    handleSearchSingle(t);
                  }}
                >
                  {t}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary KPI Cards of Loaded Assets */}
      {allCurrentAssets.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="border-border">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Ativos Consultados</p>
                <p className="text-2xl font-bold mt-1">{allCurrentAssets.length}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Layers className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Eventos de Proventos</p>
                <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                  {allDividendRows.length}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <DollarSign className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-amber-500/5 border-amber-500/30">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400 font-semibold">
                  Proventos em Agosto (Mês 08)
                </p>
                <p className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">
                  {augustDividends.length} eventos
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Calendar className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Salvar no Banco</p>
                <Button
                  id="btn-save-to-db"
                  size="sm"
                  variant="outline"
                  onClick={() => handleSaveToDatabase(allCurrentAssets)}
                  disabled={saving || allCurrentAssets.length === 0}
                  className="mt-1 h-8 gap-1.5 text-xs font-semibold"
                >
                  <Database className="w-3.5 h-3.5 text-primary" />
                  {saving ? "Salvando..." : "Gravar no Supabase"}
                </Button>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      {allCurrentAssets.length > 0 ? (
        <Tabs value={activeViewTab} onValueChange={setActiveViewTab} className="space-y-4">
          <TabsList className="grid grid-cols-4 max-w-2xl">
            <TabsTrigger value="august" className="text-xs sm:text-sm font-medium">
              Foco: Agosto ({augustDividends.length})
            </TabsTrigger>
            <TabsTrigger value="allDividends" className="text-xs sm:text-sm font-medium">
              Todos os Proventos ({allDividendRows.length})
            </TabsTrigger>
            <TabsTrigger value="assetsList" className="text-xs sm:text-sm font-medium">
              Ativos ({allCurrentAssets.length})
            </TabsTrigger>
            <TabsTrigger value="rawJson" className="text-xs sm:text-sm font-medium">
              JSON Bruto
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: AGOSTO ESPECÍFICO */}
          <TabsContent value="august" className="space-y-4">
            <Card className="border-border">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg font-bold flex items-center gap-2 text-amber-700 dark:text-amber-400">
                      <Calendar className="w-5 h-5" />
                      Proventos Registrados para o Mês de Agosto
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Lista detalhada de pagamentos com data de corte (ex-date) ou pagamento ocorridos no mês de Agosto (08).
                    </CardDescription>
                  </div>

                  {/* Year Filter */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-medium">Ano:</span>
                    <select
                      value={selectedYearFilter}
                      onChange={(e) => setSelectedYearFilter(e.target.value)}
                      className="text-xs bg-background border border-border rounded-md px-2.5 py-1 font-mono"
                    >
                      <option value="ALL">Todos os Anos</option>
                      {availableYears.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {augustDividends.length === 0 ? (
                  <div className="p-8 text-center bg-muted/20 rounded-lg border border-dashed border-border space-y-2">
                    <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto" />
                    <p className="font-semibold text-sm">Nenhum provento encontrado para o mês de Agosto nos ativos consultados.</p>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto">
                      Ativos de periodicidade trimestral (como Petrobras e Vale) ou semestrais podem não ter calendário de proventos em Agosto no ano selecionado, ao passo que bancos como ITUB4 realizam proventos mensais regulares.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-border rounded-lg">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="font-bold text-xs">Ativo</TableHead>
                          <TableHead className="font-bold text-xs">Nome</TableHead>
                          <TableHead className="font-bold text-xs">Data de Pagamento</TableHead>
                          <TableHead className="font-bold text-xs">Data Com / Registro</TableHead>
                          <TableHead className="font-bold text-xs">Tipo</TableHead>
                          <TableHead className="font-bold text-xs text-right">Valor por Cota/Ação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {augustDividends.map((div, idx) => (
                          <TableRow key={`${div.ticker}-${div.date}-${idx}`} className="hover:bg-muted/40">
                            <TableCell className="font-mono font-bold text-primary">
                              {div.ticker}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                              {div.nome}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {div.date ? new Date(div.date + "T12:00:00").toLocaleDateString("pt-BR") : "-"}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {div.recordDate ? new Date(div.recordDate + "T12:00:00").toLocaleDateString("pt-BR") : "-"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px] font-mono uppercase">
                                {div.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono font-bold text-right text-emerald-600 dark:text-emerald-400">
                              R$ {div.amount.toFixed(4)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: TODOS OS PROVENTOS */}
          <TabsContent value="allDividends" className="space-y-4">
            <Card className="border-border">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg font-bold">Histórico Completo de Proventos</CardTitle>
                    <CardDescription className="text-xs">
                      Todos os dividendos, juros sobre capital próprio e rendimentos recuperados da fonte.
                    </CardDescription>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Month selector */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground font-medium">Mês:</span>
                      <select
                        value={selectedMonthFilter}
                        onChange={(e) => setSelectedMonthFilter(e.target.value)}
                        className="text-xs bg-background border border-border rounded-md px-2 py-1 font-mono"
                      >
                        <option value="ALL">Todos</option>
                        <option value="01">01 - Jan</option>
                        <option value="02">02 - Fev</option>
                        <option value="03">03 - Mar</option>
                        <option value="04">04 - Abr</option>
                        <option value="05">05 - Mai</option>
                        <option value="06">06 - Jun</option>
                        <option value="07">07 - Jul</option>
                        <option value="08">08 - Ago</option>
                        <option value="09">09 - Set</option>
                        <option value="10">10 - Out</option>
                        <option value="11">11 - Nov</option>
                        <option value="12">12 - Dez</option>
                      </select>
                    </div>

                    {/* Year selector */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground font-medium">Ano:</span>
                      <select
                        value={selectedYearFilter}
                        onChange={(e) => setSelectedYearFilter(e.target.value)}
                        className="text-xs bg-background border border-border rounded-md px-2 py-1 font-mono"
                      >
                        <option value="ALL">Todos</option>
                        {availableYears.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="overflow-x-auto max-h-[500px] border border-border rounded-lg">
                  <Table>
                    <TableHeader className="bg-muted/60 sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="font-bold text-xs">Ativo</TableHead>
                        <TableHead className="font-bold text-xs">Data</TableHead>
                        <TableHead className="font-bold text-xs">Data Com</TableHead>
                        <TableHead className="font-bold text-xs">Tipo</TableHead>
                        <TableHead className="font-bold text-xs text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDividends.slice(0, 100).map((div, idx) => (
                        <TableRow key={`all-${div.ticker}-${div.date}-${idx}`}>
                          <TableCell className="font-mono font-bold">{div.ticker}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {div.date ? new Date(div.date + "T12:00:00").toLocaleDateString("pt-BR") : "-"}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {div.recordDate ? new Date(div.recordDate + "T12:00:00").toLocaleDateString("pt-BR") : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={div.isAugust ? "default" : "outline"} className="text-[10px] font-mono">
                              {div.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono font-bold text-right text-emerald-600 dark:text-emerald-400">
                            R$ {div.amount.toFixed(4)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {filteredDividends.length > 100 && (
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Exibindo os primeiros 100 de {filteredDividends.length} eventos para melhor performance.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: RESUMO DE ATIVOS */}
          <TabsContent value="assetsList" className="space-y-4">
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold">Ativos Carregados</CardTitle>
                <CardDescription className="text-xs">
                  Cotações atuais, dividendos nos últimos 12 meses e contagem de histórico.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto border border-border rounded-lg">
                  <Table>
                    <TableHeader className="bg-muted/60">
                      <TableRow>
                        <TableHead className="font-bold text-xs">Ticker</TableHead>
                        <TableHead className="font-bold text-xs">Nome do Ativo</TableHead>
                        <TableHead className="font-bold text-xs">Setor</TableHead>
                        <TableHead className="font-bold text-xs text-right">Preço Atual</TableHead>
                        <TableHead className="font-bold text-xs text-right">Proventos 12M</TableHead>
                        <TableHead className="font-bold text-xs text-right">Histórico Preços</TableHead>
                        <TableHead className="font-bold text-xs text-right">Total Dividendos</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allCurrentAssets.map((asset) => (
                        <TableRow key={asset.ticker} className="hover:bg-muted/40">
                          <TableCell className="font-mono font-bold text-primary">
                            {asset.ticker}
                          </TableCell>
                          <TableCell className="text-xs">{asset.nome}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{asset.setor}</TableCell>
                          <TableCell className="font-mono font-bold text-right">
                            R$ {asset.preco_atual.toFixed(2)}
                          </TableCell>
                          <TableCell className="font-mono font-semibold text-right text-emerald-600 dark:text-emerald-400">
                            R$ {asset.dividendos_12m.toFixed(2)}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-right text-muted-foreground">
                            {asset.historico_precos?.length || 0} meses
                          </TableCell>
                          <TableCell className="font-mono text-xs font-bold text-right">
                            {asset.historico_dividendos?.length || 0} eventos
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: JSON BRUTO */}
          <TabsContent value="rawJson" className="space-y-4">
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold">Payload JSON em Memória</CardTitle>
                <CardDescription className="text-xs">
                  Dados estruturados retornados diretamente pelo cliente do Yahoo Finance.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 p-4 rounded-lg border border-border max-h-[500px] overflow-y-auto">
                  <pre className="text-xs font-mono whitespace-pre-wrap">
                    {JSON.stringify(rawPayload, null, 2)}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        /* Empty State */
        <Card className="border-border border-dashed">
          <CardContent className="py-12 text-center space-y-3">
            <Search className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="text-base font-semibold">Nenhum ativo consultado ainda</p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Clique em um dos atalhos acima (ex: ITUB4, PETR4, MXRF11) ou clique em "Consultar Carteira" para carregar as cotações e o histórico de dividendos.
            </p>
            <div className="pt-2 flex justify-center gap-2">
              <Button onClick={() => handleSearchSingle("ITUB4")} size="sm" className="gap-1.5">
                <Search className="w-3.5 h-3.5" />
                Testar ITUB4
              </Button>
              <Button onClick={handleSearchPortfolio} size="sm" variant="secondary" className="gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Testar Carteira
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default YFinanceTest;
