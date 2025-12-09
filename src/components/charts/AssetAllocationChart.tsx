import { useMemo, useState } from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { mapInvestmentType } from "@/lib/investment-mapping";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// Helper to provide consistent labels for manual asset types
const assetTypeLabels: { [key: string]: string } = {
  STOCK: "Ação",
  FII: "FII",
  FIXED_INCOME: "Renda Fixa",
  CRYPTO: "Cripto",
  OTHER: "Outro",
};

// Defines the data structure for an asset
interface AssetData {
  symbol: string;
  marketValue: number;
  type: string; // Type from B3 integration
  subtype: string | null; // Subtype from B3 integration
  asset_type?: string; // Type from manual transactions
}

// Gets a unified, user-friendly display type for any asset
const getAssetDisplayType = (asset: AssetData): string => {
  if (asset.asset_type) {
    return assetTypeLabels[asset.asset_type] || asset.asset_type;
  }
  return mapInvestmentType(asset.type, asset.subtype).label_pt;
};

// Expanded color palette for better visualization
const COLORS = [
  "#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AF19FF",
  "#FF3D3D", "#A43E7A", "#2E8B57", "#4682B4", "#D2691E",
  "#FF69B4", "#6A5ACD", "#B8860B", "#800000", "#008080"
];

interface AssetAllocationChartProps {
  data?: AssetData[];
  isLoading: boolean;
}

export default function AssetAllocationChart({
  data,
  isLoading,
}: AssetAllocationChartProps) {
  // State to toggle between view by type (false) and by asset (true)
  const [showByAsset, setShowByAsset] = useState(false);

  const { chartData, totalValue } = useMemo(() => {
    if (!data) {
      return { chartData: [], totalValue: 0 };
    }

    const allocation = data
      .filter((asset) => asset.marketValue > 0)
      .reduce((acc, asset) => {
        // Group by individual asset symbol if toggled, otherwise by asset type
        const key = showByAsset ? asset.symbol : getAssetDisplayType(asset);
        
        if (!acc[key]) {
          acc[key] = { name: key, value: 0 };
        }
        acc[key].value += asset.marketValue;
        return acc;
      }, {} as { [key: string]: { name: string; value: number } });

    // Sort data from largest to smallest for a consistent and readable chart
    const sortedChartData = Object.values(allocation).sort((a, b) => b.value - a.value);

    return {
      chartData: sortedChartData,
      totalValue: data.reduce((sum, asset) => sum + asset.marketValue, 0),
    };
  }, [data, showByAsset]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Alocação de Ativos</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  // Custom tooltip component for detailed info on hover/touch
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      const percentage = totalValue > 0 ? (dataPoint.value / totalValue) * 100 : 0;
      return (
        <div className="bg-background/80 backdrop-blur-sm p-2 border border-border rounded-md shadow-lg">
          <p className="font-semibold">{dataPoint.name}</p>
          <p className="text-sm text-muted-foreground">{`Valor: ${dataPoint.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}</p>
          <p className="text-sm text-muted-foreground">{`Alocação: ${percentage.toFixed(2)}%`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Alocação de Ativos</CardTitle>
        <div className="flex items-center space-x-2">
          <Label htmlFor="view-switch">Por Tipo</Label>
          <Switch
            id="view-switch"
            checked={showByAsset}
            onCheckedChange={setShowByAsset}
          />
          <Label htmlFor="view-switch">Por Ativo</Label>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="middle"
                align="right"
                layout="vertical"
                iconSize={10}
                wrapperStyle={{
                    right: -10,
                    width: '35%',
                    overflowY: 'auto',
                    maxHeight: 300,
                }}
                formatter={(value, entry) => {
                    const dataPoint = chartData.find(d => d.name === value);
                    const percentage = totalValue > 0 && dataPoint ? (dataPoint.value / totalValue) * 100 : 0;
                    return (
                        <span style={{ color: 'inherit' }} className="text-xs">
                            {value} ({percentage.toFixed(1)}%)
                        </span>
                    );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex justify-center items-center h-[300px]">
            <p className="text-muted-foreground">Não há dados de alocação para exibir.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}