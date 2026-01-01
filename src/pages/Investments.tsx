import { useEffect, useMemo } from "react";
import { useB3Data } from "@/hooks/useB3Data";
import EnhancedAssetTable from "@/components/EnhancedAssetTable";
import PortfolioEvolutionChart from "@/components/charts/PortfolioEvolutionChart";
import DividendHistoryChart from "@/components/charts/DividendHistoryChart";
import { DividendMonthlyTable } from "@/components/DividendMonthlyTable";
import { FinancialCard } from "@/components/FinancialCard";
import { ManualInvestmentTransactions } from "@/components/ManualInvestmentTransactions";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";
import { FeatureGate } from "@/components/FeatureGate";

const Investments = () => {
  const {
    enhancedAssets,
    portfolioEvolution,
    dividendHistory,
    getEnhancedAssetsData,
    getPortfolioEvolutionData,
    getDividendHistoryData,
    loading,
  } = useB3Data();

  // Load data on mount
  useEffect(() => {
    const loadInitialData = async () => {
      await getEnhancedAssetsData(true);
      await getPortfolioEvolutionData("12m", true);
      await getDividendHistoryData();
    };

    loadInitialData();
  }, [getEnhancedAssetsData, getPortfolioEvolutionData, getDividendHistoryData]);

  const totalValue = useMemo(() => {
    if (!Array.isArray(enhancedAssets)) return 0;
    return enhancedAssets.reduce((sum, asset) => sum + asset.marketValue, 0);
  }, [enhancedAssets]);

  const totalCost = useMemo(() => {
    if (!Array.isArray(enhancedAssets)) return 0;
    return enhancedAssets.reduce((sum, asset) => sum + asset.cost, 0);
  }, [enhancedAssets]);

  const totalProfitLoss = totalValue - totalCost;
  const totalProfitability = totalCost > 0 ? (totalProfitLoss / totalCost) * 100 : 0;

  const handleRefresh = async () => {
    await getEnhancedAssetsData(true);
    await getPortfolioEvolutionData("12m", true);
    await getDividendHistoryData();
  };

  return (
    <FeatureGate feature="investments">
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Meus Investimentos</h1>
          <Button onClick={handleRefresh} disabled={loading} size="sm">
            <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar Dados
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <FinancialCard
            title="Patrimônio Total"
            amount={totalValue}
            isCurrency
            isLoading={loading}
          />
          <FinancialCard
            title="Lucro/Prejuízo Total"
            amount={totalProfitLoss}
            isCurrency
            isPositive={totalProfitLoss >= 0}
            isNegative={totalProfitLoss < 0}
            isLoading={loading}
          />
          <FinancialCard
            title="Rentabilidade Total"
            amount={totalProfitability}
            isPercentage
            isPositive={totalProfitability >= 0}
            isNegative={totalProfitability < 0}
            isLoading={loading}
          />
          <FinancialCard
            title="Dividendos (12M)"
            amount={Array.isArray(enhancedAssets) ? enhancedAssets.reduce((sum, asset) => sum + asset.accumulatedDividends, 0) : 0}
            isCurrency
            isLoading={loading}
          />
        </div>

        <div className="mb-6">
          <PortfolioEvolutionChart data={portfolioEvolution} loading={loading} />
        </div>

        <div className="mb-6">
          <ManualInvestmentTransactions onTransactionsUpdate={handleRefresh} />
        </div>

        <div className="mb-6">
          <EnhancedAssetTable assets={enhancedAssets} loading={loading} />
        </div>

        <div className="mb-6">
          <DividendMonthlyTable assetsData={dividendHistory} loading={loading} />
        </div>

        <div className="mb-6">
          <DividendHistoryChart data={[]} loading={loading} />
        </div>
      </div>
    </FeatureGate>
  );
};

export default Investments;
