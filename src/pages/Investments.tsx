import { useEffect, useMemo, useState } from "react";
import { useB3Data } from "@/hooks/useB3Data";
import { useToast } from "@/hooks/use-toast";
import EnhancedAssetTable from "@/components/EnhancedAssetTable";
import PortfolioEvolutionChart from "@/components/charts/PortfolioEvolutionChart";
import DividendHistoryChart from "@/components/charts/DividendHistoryChart";
import MonthlyAssetBreakdownChart from "@/components/charts/MonthlyAssetBreakdownChart";
import AssetAllocationChart from "@/components/charts/AssetAllocationChart";
import { DividendMonthlyTable } from "@/components/DividendMonthlyTable";
import { DividendScheduleCard } from "@/components/DividendScheduleCard";
import { FinancialCard } from "@/components/FinancialCard";
import { ManualInvestmentTransactions } from "@/components/ManualInvestmentTransactions";
import { PortfolioNewsTab } from "@/components/PortfolioNewsTab";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCcw, PieChart, Coins, ArrowLeftRight, Newspaper, FileSpreadsheet } from "lucide-react";
import { FeatureGate } from "@/components/FeatureGate";
import { B3StatementImporterDialog } from "@/components/B3StatementImporterDialog";

const Investments = () => {
  const [activeTab, setActiveTab] = useState("portfolio");
  const [isB3ImporterOpen, setIsB3ImporterOpen] = useState(false);
  const { toast } = useToast();
  const {
    enhancedAssets,
    portfolioEvolution,
    dividendHistory,
    getEnhancedAssetsData,
    getPortfolioEvolutionData,
    getDividendHistoryData,
    loading,
  } = useB3Data();

  // Load data on mount in parallel
  useEffect(() => {
    Promise.allSettled([
      getEnhancedAssetsData(false),
      getPortfolioEvolutionData("12m", false),
      getDividendHistoryData(undefined, false),
    ]);
  }, [getEnhancedAssetsData, getPortfolioEvolutionData, getDividendHistoryData]);

  const totalValue = useMemo(() => {
    if (!Array.isArray(enhancedAssets)) return 0;
    return enhancedAssets.reduce((sum, asset) => sum + (Number(asset.marketValue) || 0), 0);
  }, [enhancedAssets]);

  const totalCost = useMemo(() => {
    if (!Array.isArray(enhancedAssets)) return 0;
    return enhancedAssets.reduce((sum, asset) => sum + (Number(asset.cost) || 0), 0);
  }, [enhancedAssets]);

  const totalProfitLoss = useMemo(() => {
    return totalValue - totalCost;
  }, [totalValue, totalCost]);

  const totalProfitability = useMemo(() => {
    return totalCost > 0 ? (totalProfitLoss / totalCost) * 100 : 0;
  }, [totalProfitLoss, totalCost]);

  const totalDividends12M = useMemo(() => {
    if (!Array.isArray(enhancedAssets)) return 0;
    return enhancedAssets.reduce((sum, asset) => sum + (Number(asset.accumulatedDividends) || 0), 0);
  }, [enhancedAssets]);

  const isInitialLoading = loading && enhancedAssets.length === 0;

  const handleRefresh = async (changedTickers?: string[]) => {
    try {
      toast({
        title: "Atualizando cotações...",
        description: "Buscando dados mais recentes de mercado.",
      });
      await Promise.allSettled([
        getEnhancedAssetsData(true),
        getPortfolioEvolutionData("12m", true),
        getDividendHistoryData(changedTickers, true),
      ]);
      toast({
        title: "Cotações atualizadas",
        description: "Dados atualizados e sincronizados com sucesso!",
      });
    } catch (err) {
      toast({
        title: "Erro na atualização",
        description: "Ocorreu um erro ao atualizar as cotações.",
        variant: "destructive",
      });
    }
  };

  return (
    <FeatureGate feature="investments">
      <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Investimentos & Patrimônio
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Visão consolidada da sua carteira, distribuição e proventos
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
            <Button
              onClick={() => setIsB3ImporterOpen(true)}
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-950/40"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Importar B3 (Excel/CSV)
            </Button>
            <Button
              onClick={() => handleRefresh()}
              disabled={loading}
              size="sm"
              variant="outline"
              className="gap-2 text-xs font-medium"
            >
              <RefreshCcw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? "Sincronizando..." : "Atualizar Cotações"}
            </Button>
          </div>
        </div>

        {/* Essential 4 KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <FinancialCard
            title="Patrimônio Total"
            amount={totalValue}
            isCurrency
            isLoading={isInitialLoading}
          />
          <FinancialCard
            title="Lucro / Prejuízo"
            amount={totalProfitLoss}
            isCurrency
            isPositive={totalProfitLoss > 0.005}
            isNegative={totalProfitLoss < -0.005}
            isLoading={isInitialLoading}
          />
          <FinancialCard
            title="Rentabilidade"
            amount={totalProfitability}
            isPercentage
            isPositive={totalProfitability > 0.005}
            isNegative={totalProfitability < -0.005}
            isLoading={isInitialLoading}
          />
          <FinancialCard
            title="Proventos (12M)"
            amount={totalDividends12M}
            isCurrency
            isLoading={isInitialLoading}
          />
        </div>

        {/* Clean 4-Tab Structural Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 max-w-xl h-auto sm:h-11 p-1 bg-muted/60 gap-1">
            <TabsTrigger value="portfolio" className="flex items-center gap-1.5 text-xs sm:text-sm font-medium py-2 sm:py-1.5">
              <PieChart className="h-4 w-4" />
              <span>Carteira</span>
            </TabsTrigger>
            <TabsTrigger value="dividends" className="flex items-center gap-1.5 text-xs sm:text-sm font-medium py-2 sm:py-1.5">
              <Coins className="h-4 w-4" />
              <span>Proventos</span>
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center gap-1.5 text-xs sm:text-sm font-medium py-2 sm:py-1.5">
              <ArrowLeftRight className="h-4 w-4" />
              <span>Aportes</span>
            </TabsTrigger>
            <TabsTrigger value="news" className="flex items-center gap-1.5 text-xs sm:text-sm font-medium py-2 sm:py-1.5">
              <Newspaper className="h-4 w-4" />
              <span>Notícias & Fatos</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: CARTEIRA & POSIÇÃO */}
          <TabsContent value="portfolio" className="space-y-6 mt-0">
            {/* Visual Allocation and Evolution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AssetAllocationChart data={enhancedAssets as any} isLoading={isInitialLoading} />
              <PortfolioEvolutionChart data={portfolioEvolution} loading={isInitialLoading && portfolioEvolution.length === 0} />
            </div>

            {/* Assets Table */}
            <div className="space-y-3">
              <EnhancedAssetTable assets={enhancedAssets} loading={isInitialLoading} />
            </div>
          </TabsContent>

          {/* TAB 2: PROVENTOS & RENDA PASSIVA */}
          <TabsContent value="dividends" className="space-y-6 mt-0">
            {/* Upcoming Schedules & Monthly Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DividendScheduleCard data={dividendHistory} assets={enhancedAssets} loading={isInitialLoading && dividendHistory.length === 0} />
              <MonthlyAssetBreakdownChart data={dividendHistory} userAssets={enhancedAssets} loading={isInitialLoading && dividendHistory.length === 0} />
            </div>

            {/* Dividend History Chart */}
            <div>
              <DividendHistoryChart data={dividendHistory} assets={enhancedAssets} loading={isInitialLoading && dividendHistory.length === 0} />
            </div>

            {/* Detailed Monthly Dividend Table */}
            <div>
              <DividendMonthlyTable assetsData={dividendHistory} assets={enhancedAssets} loading={isInitialLoading && dividendHistory.length === 0} />
            </div>
          </TabsContent>

          {/* TAB 3: APORTES & MOVIMENTAÇÕES */}
          <TabsContent value="transactions" className="space-y-6 mt-0">
            <ManualInvestmentTransactions onTransactionsUpdate={handleRefresh} />
          </TabsContent>

          {/* TAB 4: NOTÍCIAS & FATOS RELEVANTES DO PORTFÓLIO */}
          <TabsContent value="news" className="space-y-6 mt-0">
            <PortfolioNewsTab assets={enhancedAssets} />
          </TabsContent>
        </Tabs>

        {/* B3 Statement Importer Dialog */}
        <B3StatementImporterDialog
          open={isB3ImporterOpen}
          onOpenChange={setIsB3ImporterOpen}
          onImportSuccess={handleRefresh}
        />
      </div>
    </FeatureGate>
  );
};

export default Investments;
