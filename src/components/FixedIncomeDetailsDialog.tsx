import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Landmark,
  Calendar,
  Clock,
  TrendingUp,
  Percent,
  ShieldCheck,
  Calculator,
  Info,
} from "lucide-react";
import {
  FixedIncomeCalculationResult,
  simulateFixedIncomeGrowth,
  DEFAULT_MARKET_RATES,
} from "@/lib/fixed-income-calculator";

interface FixedIncomeDetailsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  asset: {
    symbol: string;
    name: string;
    marketValue: number;
    cost: number;
    profitLoss: number;
    profitability: number;
    fixedIncome?: FixedIncomeCalculationResult;
  } | null;
}

export const FixedIncomeDetailsDialog = ({
  isOpen,
  onOpenChange,
  asset,
}: FixedIncomeDetailsDialogProps) => {
  const [simulationMonths, setSimulationMonths] = useState<number>(12);
  const [showSimulator, setShowSimulator] = useState<boolean>(false);

  if (!asset) return null;

  const fi = asset.fixedIncome;
  const initialCost = fi?.initialAmount || asset.cost;
  const grossValue = fi?.currentGrossAmount || asset.marketValue;
  const grossInterest = fi?.accruedInterest || asset.profitLoss;
  const profitability = fi?.profitabilityPercent || asset.profitability;
  const parsedRate = fi?.parsedRate;
  const isExempt = parsedRate?.isExemptFromIR || false;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  const formatPercent = (val: number) => {
    return `${val.toFixed(2)}%`;
  };

  const simulationData = parsedRate
    ? simulateFixedIncomeGrowth(grossValue, simulationMonths, parsedRate, DEFAULT_MARKET_RATES)
    : [];

  const finalSimulated = simulationData[simulationData.length - 1];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1.5 border-b pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300">
                <Landmark className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold">
                  {asset.name}
                </DialogTitle>
                <DialogDescription asChild>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                    <span>Código: {asset.symbol}</span>
                    {parsedRate && (
                      <Badge variant="secondary" className="text-[10px] font-semibold bg-amber-500/15 text-amber-900 dark:text-amber-200">
                        {parsedRate.label}
                      </Badge>
                    )}
                    {isExempt && (
                      <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 flex items-center gap-0.5">
                        <ShieldCheck className="h-3 w-3" /> Isento de IR
                      </Badge>
                    )}
                  </div>
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Resumo de Rendimentos */}
        <div className="space-y-4 pt-1">
          {/* Cards principais de Saldo e Rendimento */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl border bg-muted/30">
              <span className="text-xs text-muted-foreground font-medium block">
                Saldo Bruto Atualizado
              </span>
              <span className="text-xl font-bold text-foreground block mt-1">
                {formatCurrency(grossValue)}
              </span>
              <span className="text-[11px] text-muted-foreground">
                Custo inicial: {formatCurrency(initialCost)}
              </span>
            </div>

            <div className="p-3.5 rounded-xl border bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/20">
              <span className="text-xs text-emerald-800 dark:text-emerald-300 font-medium block">
                Juros Recebidos / Rendimento
              </span>
              <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 block mt-1">
                +{formatCurrency(grossInterest)}
              </span>
              <span className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 font-medium">
                +{formatPercent(profitability)} no período
              </span>
            </div>
          </div>

          {/* Detalhamento de Taxas e Imposto */}
          <div className="rounded-xl border p-4 space-y-3 bg-card">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-amber-500" />
              Parâmetros e Tributação
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">Taxa Referência:</span>
                <span className="font-semibold text-foreground">
                  {parsedRate?.label || "100% CDI"}
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  {fi ? `~${fi.annualizedRatePercent}% a.a.` : "Curva CDI"}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[11px]">Dias Decorridos:</span>
                <span className="font-semibold text-foreground">
                  {fi ? `${fi.calendarDays} corridos` : "—"}
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  {fi ? `(${fi.businessDays} dias úteis)` : "—"}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[11px]">Imposto de Renda:</span>
                <span className="font-semibold text-foreground">
                  {isExempt ? "Isento (0%)" : `${fi?.irRatePercent || 15}%`}
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  {isExempt ? "Sem retenção" : `- ${formatCurrency(fi?.irAmount || 0)}`}
                </span>
              </div>
            </div>

            {/* Saldo Líquido Estimado */}
            {!isExempt && fi && fi.irAmount > 0 && (
              <div className="pt-2 border-t flex items-center justify-between text-xs">
                <div>
                  <span className="text-muted-foreground">Saldo Líquido Estimado (após IR):</span>
                  <p className="text-[10px] text-muted-foreground">
                    Juros líquidos: +{formatCurrency(fi.netInterest)}
                  </p>
                </div>
                <span className="text-sm font-bold text-foreground">
                  {formatCurrency(fi.currentNetAmount)}
                </span>
              </div>
            )}
          </div>

          {/* Toggle Simulador Futuro */}
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowSimulator(!showSimulator)}
              className="w-full text-xs font-medium gap-1.5 border-dashed"
            >
              <Calculator className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              {showSimulator ? "Ocultar Simulador Futuro" : "Simular Rendimento Futuro"}
            </Button>

            {showSimulator && (
              <div className="mt-3 p-3.5 rounded-xl border bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Prazo adicional de projeção:</Label>
                  <div className="flex gap-1">
                    {[6, 12, 24, 36].map((m) => (
                      <Button
                        key={m}
                        type="button"
                        size="sm"
                        variant={simulationMonths === m ? "default" : "outline"}
                        onClick={() => setSimulationMonths(m)}
                        className="h-7 px-2 text-[11px]"
                      >
                        {m}m
                      </Button>
                    ))}
                  </div>
                </div>

                {finalSimulated && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t text-xs">
                    <div className="p-2.5 rounded-lg bg-background border">
                      <span className="text-[11px] text-muted-foreground block">Saldo Bruto Projetado ({simulationMonths} meses):</span>
                      <span className="text-sm font-bold text-foreground block mt-0.5">
                        {formatCurrency(finalSimulated.grossAmount)}
                      </span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                        +{formatCurrency(finalSimulated.grossAmount - grossValue)} de juros
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-background border">
                      <span className="text-[11px] text-muted-foreground block">Saldo Líquido Projetado:</span>
                      <span className="text-sm font-bold text-foreground block mt-0.5">
                        {formatCurrency(finalSimulated.netAmount)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Após IR regressivo
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
