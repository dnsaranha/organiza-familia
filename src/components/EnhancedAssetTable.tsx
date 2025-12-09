import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Download, Search, ArrowUpDown } from "lucide-react";
import { useState, useMemo } from "react";
import { mapInvestmentType, investmentMapping } from "@/lib/investment-mapping";

// Add asset_type to AssetData
interface AssetData {
  symbol: string;
  name: string;
  type: string;
  subtype: string | null;
  currentPrice: number;
  quantity: number;
  marketValue: number;
  cost: number;
  averagePrice: number;
  yieldOnCost: number;
  accumulatedDividends: number;
  profitLoss: number;
  profitability: number;
  asset_type?: string; // Manual asset type
}

interface EnhancedAssetTableProps {
  assets: AssetData[];
  loading?: boolean;
}

type SortField = keyof AssetData | "mappedType";
type SortDirection = "asc" | "desc";

const assetTypeLabels: { [key: string]: string } = {
  STOCK: "Ação",
  FII: "FII",
  FIXED_INCOME: "Renda Fixa",
  CRYPTO: "Cripto",
  OTHER: "Outro",
};


const EnhancedAssetTable = ({
  assets,
  loading = false,
}: EnhancedAssetTableProps) => {
  const [assetFilter, setAssetFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("marketValue");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const filterOptions = useMemo(() => {
    const mainTypes = investmentMapping.map((item) => item.label_pt);
    const subtypes = investmentMapping.flatMap((item) =>
      item.subtypes.map((sub) => sub.label_pt),
    );
    // Add manual asset types to filter options
    const manualTypes = Object.values(assetTypeLabels);
    return ["Todos", ...new Set([...mainTypes, ...subtypes, ...manualTypes])];
  }, []);

  const getAssetDisplayType = (asset: AssetData) => {
    if (asset.asset_type) {
      return assetTypeLabels[asset.asset_type] || asset.asset_type;
    }
    return mapInvestmentType(asset.type, asset.subtype).label_pt;
  };

  const filteredAndSortedAssets = useMemo(() => {
    let filtered = assets.filter((asset) => {
      const displayType = getAssetDisplayType(asset);
      const matchesFilter = assetFilter === "all" || assetFilter === "Todos" || displayType === assetFilter;

      const matchesSearch =
        asset.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (asset.name &&
          asset.name.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesFilter && matchesSearch;
    });

    return filtered.sort((a, b) => {
      let aValue, bValue;

      if (sortField === "mappedType") {
        aValue = getAssetDisplayType(a);
        bValue = getAssetDisplayType(b);
      } else {
        aValue = a[sortField as keyof AssetData];
        bValue = b[sortField as keyof AssetData];
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });
  }, [assets, assetFilter, searchTerm, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    if (value === null || value === undefined || isNaN(value)) {
      return "0.00%";
    }
    return `${value.toFixed(2)}%`;
  };

  const getAssetTypeColor = (asset: AssetData) => {
    const displayType = getAssetDisplayType(asset);

    if (asset.asset_type) {
        switch (asset.asset_type) {
            case "STOCK": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
            case "FII": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
            case "FIXED_INCOME": return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
            case "CRYPTO": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
            default: return "bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-300";
        }
    }

    const mainType = investmentMapping.find((t) => t.type === asset.type)?.label_pt || "Outros";
    switch (mainType) {
      case "Renda Fixa":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
      case "Renda Variável":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "Fundos de Investimento":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "Previdência":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
      case "ETF":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300";
      case "COE":
        return "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-300";
    }
  };

  const exportData = () => {
    const csvContent = [
      [
        "Ativo",
        "Nome",
        "Tipo",
        "Preço",
        "Quantidade",
        "Valor de Mercado",
        "Custo",
        "P.M.",
        "YoC (%)",
        "Proventos Acumulados",
        "Lucro/Prejuízo",
        "Rentabilidade (%)",
      ].join(","),
      ...filteredAndSortedAssets.map((asset) => {
        const displayType = getAssetDisplayType(asset);
        return [
          asset.symbol,
          asset.name,
          displayType,
          asset.currentPrice,
          asset.quantity,
          asset.marketValue,
          asset.cost,
          asset.averagePrice,
          asset.yieldOnCost,
          asset.accumulatedDividends,
          asset.profitLoss,
          asset.profitability,
        ].join(",");
      }),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "meus-ativos.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const SortableHeader = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => (
    <TableHead
      className="cursor-pointer hover:bg-muted/50 select-none"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className="h-3 w-3" />
      </div>
    </TableHead>
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Meus Ativos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">
              Carregando ativos...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <CardTitle>Meus Ativos ({filteredAndSortedAssets.length})</CardTitle>
          <div className="flex flex-col md:flex-row gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar ativo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full md:w-48"
              />
            </div>
            <Select value={assetFilter} onValueChange={setAssetFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filtrar por tipo..." />
              </SelectTrigger>
              <SelectContent>
                {filterOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={exportData} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto overflow-y-auto max-h-[600px] md:max-h-[700px] lg:max-h-[800px]">
          <Table className="min-w-[1000px]">
            <TableHeader>
              <TableRow>
                <SortableHeader field="symbol">Ativo</SortableHeader>
                <SortableHeader field="mappedType">Tipo</SortableHeader>
                <SortableHeader field="currentPrice">Preço</SortableHeader>
                <SortableHeader field="quantity">Quantidade</SortableHeader>
                <SortableHeader field="marketValue">
                  Valor de Mercado
                </SortableHeader>
                <SortableHeader field="cost">Custo</SortableHeader>
                <SortableHeader field="averagePrice">P.M.</SortableHeader>
                <SortableHeader field="yieldOnCost">YoC (%)</SortableHeader>
                <SortableHeader field="accumulatedDividends">
                  Proventos Acum.
                </SortableHeader>
                <SortableHeader field="profitLoss">
                  Lucro/Prejuízo
                </SortableHeader>
                <SortableHeader field="profitability">
                  Rentabilidade (%)
                </SortableHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedAssets.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={11}
                    className="text-center py-8 text-muted-foreground"
                  >
                    {searchTerm || assetFilter !== "all"
                      ? "Nenhum ativo encontrado com os filtros aplicados."
                      : "Nenhum ativo na carteira."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedAssets.map((asset) => {
                  const displayType = getAssetDisplayType(asset);
                  return (
                    <TableRow key={asset.symbol} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <div>
                          <p className="font-semibold">{asset.symbol}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-24">
                            {asset.name}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={getAssetTypeColor(asset)}
                        >
                          {displayType || "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(asset.currentPrice)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {asset.quantity
                          ? asset.quantity.toLocaleString("pt-BR", {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: asset.quantity < 1 ? 6 : 0,
                            })
                          : "0"}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(asset.marketValue)}
                      </TableCell>
                      <TableCell>{formatCurrency(asset.cost)}</TableCell>
                      <TableCell>
                        {formatCurrency(asset.averagePrice)}
                      </TableCell>
                      <TableCell className="text-success dark:text-success-light font-medium">
                        {formatPercent(asset.yieldOnCost)}
                      </TableCell>
                      <TableCell className="text-primary dark:text-primary-light font-medium">
                        {formatCurrency(asset.accumulatedDividends)}
                      </TableCell>
                      <TableCell
                        className={`font-medium ${
                          asset.profitLoss >= 0
                            ? "text-success dark:text-success-light"
                            : "text-expense dark:text-expense-light"
                        }`}
                      >
                        {formatCurrency(asset.profitLoss)}
                      </TableCell>
                      <TableCell
                        className={`font-medium ${
                          asset.profitability >= 0
                            ? "text-success dark:text-success-light"
                            : "text-expense dark:text-expense-light"
                        }`}
                      >
                        {asset.profitability >= 0 ? "+" : ""}
                        {formatPercent(asset.profitability)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedAssetTable;
