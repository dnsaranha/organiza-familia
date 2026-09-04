import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle, Upload, Download, Landmark, TrendingUp, Coins, Sparkles, Building2, Calendar, DollarSign, FileSpreadsheet } from "lucide-react";
import { InvestmentTransactionHistory } from "@/components/InvestmentTransactionHistory";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { calculateManualPositions, Transaction } from "@/lib/finance-utils";
import { parseFixedIncomeRate } from "@/lib/fixed-income-calculator";
import { B3StatementImporterDialog } from "@/components/B3StatementImporterDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { TickerSearch } from "@/components/TickerSearch";
import * as XLSX from "xlsx";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

// Defining the asset types
const assetTypes = [
  { value: "FIXED_INCOME", label: "Renda Fixa (CDB, Tesouro, LCI, LCA)", icon: Landmark },
  { value: "STOCK", label: "Ação (Bolsa B3)", icon: TrendingUp },
  { value: "FII", label: "Fundo Imobiliário (FII)", icon: Building2 },
  { value: "CRYPTO", label: "Criptomoeda", icon: Coins },
  { value: "OTHER", label: "Outro Ativo", icon: DollarSign },
];

const fixedIncomeCategories = [
  { value: "CDB", label: "CDB (Certificado de Depósito Bancário)" },
  { value: "Tesouro Selic", label: "Tesouro Selic" },
  { value: "Tesouro IPCA+", label: "Tesouro IPCA+" },
  { value: "Tesouro Prefixado", label: "Tesouro Prefixado" },
  { value: "LCI", label: "LCI (Letra de Crédito Imobiliário)" },
  { value: "LCA", label: "LCA (Letra de Crédito do Agronegócio)" },
  { value: "CRI / CRA", label: "CRI / CRA (Isento de IR)" },
  { value: "Debênture", label: "Debênture" },
  { value: "Outro", label: "Outro Título de Renda Fixa" },
];

const quickSuggestions = [
  { name: "CDB Banco Inter 110% CDI", category: "CDB", ticker: "CDB-INTER-110", rate: "110% CDI", issuer: "Banco Inter" },
  { name: "Tesouro Selic 2029", category: "Tesouro Selic", ticker: "TESOURO-SELIC-2029", rate: "100% Selic", issuer: "Tesouro Nacional" },
  { name: "Tesouro IPCA+ 2035", category: "Tesouro IPCA+", ticker: "TESOURO-IPCA-2035", rate: "IPCA + 6,5% a.a.", issuer: "Tesouro Nacional" },
  { name: "LCI Nubank 95% CDI", category: "LCI", ticker: "LCI-NUBANK-95", rate: "95% CDI", issuer: "Nubank" },
  { name: "CDB PagBank 112% CDI", category: "CDB", ticker: "CDB-PAGBANK-112", rate: "112% CDI", issuer: "PagBank" },
];

const generateFixedIncomeTicker = (name: string, category: string): string => {
  const base = (name || category || "RENDA-FIXA").trim();
  const normalized = base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .trim();
  
  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "RENDA-FIXA";
  const ticker = words.slice(0, 3).join("-");
  return ticker.substring(0, 20);
};

interface ManualInvestmentTransactionsProps {
  onTransactionsUpdate?: (changedTickers?: string[]) => void;
}

export function ManualInvestmentTransactions({
  onTransactionsUpdate,
}: ManualInvestmentTransactionsProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isB3ImporterOpen, setIsB3ImporterOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [transactionData, setTransactionData] = useState<any>({
    ticker: "",
    asset_name: "",
    asset_type: "STOCK",
    transaction_date: new Date().toISOString().split("T")[0],
    transaction_type: "buy",
    quantity: "",
    price: "",
    fees: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("investment_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("transaction_date", { ascending: false });

      if (error) throw error;
      setTransactions((data || []) as Transaction[]);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar as transações",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  // Excel import handler
  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      if (jsonData.length === 0) {
        throw new Error("Planilha vazia");
      }

      const transactionsToInsert = jsonData.map((row) => {
        // Support various column name formats
        const ticker = row.ticker || row.Ticker || row.TICKER || row.codigo || row.Código || "";
        const assetName = row.asset_name || row.nome || row.Nome || row.NOME || ticker;
        const assetType = row.asset_type || row.tipo_ativo || row.Tipo || "STOCK";
        const transactionType = (row.transaction_type || row.tipo || row.Tipo || "buy").toLowerCase();
        const quantity = parseFloat(row.quantity || row.quantidade || row.Quantidade || 0);
        const price = parseFloat(row.price || row.preco || row.Preço || row.valor || 0);
        const fees = parseFloat(row.fees || row.taxas || row.Taxas || 0);
        
        // Parse date in various formats
        let transactionDate = new Date().toISOString().split("T")[0];
        const dateValue = row.transaction_date || row.data || row.Data || row.date;
        if (dateValue) {
          if (typeof dateValue === "number") {
            // Excel serial date
            const excelDate = XLSX.SSF.parse_date_code(dateValue);
            transactionDate = `${excelDate.y}-${String(excelDate.m).padStart(2, "0")}-${String(excelDate.d).padStart(2, "0")}`;
          } else {
            const parsed = new Date(dateValue);
            if (!isNaN(parsed.getTime())) {
              transactionDate = parsed.toISOString().split("T")[0];
            }
          }
        }

        const typeMap: Record<string, string> = {
          compra: "buy", buy: "buy", aplicacao: "buy", aplicação: "buy", aporte: "buy",
          venda: "sell", sell: "sell", resgate: "sell",
          split: "split", desdobramento: "split",
          agrupamento: "grouping", grouping: "grouping",
          bonificação: "bonus", bonificacao: "bonus", bonus: "bonus",
        };
        const mappedType = typeMap[transactionType] || "buy";

        // Map asset types intelligently
        const rawAssetType = String(assetType).toUpperCase().trim();
        let normalizedAssetType = "STOCK";
        if (rawAssetType.includes("RENDA") || rawAssetType.includes("FIXA") || rawAssetType.includes("CDB") || rawAssetType.includes("TESOURO") || rawAssetType.includes("LCI") || rawAssetType.includes("LCA") || rawAssetType.includes("DEB")) {
          normalizedAssetType = "FIXED_INCOME";
        } else if (rawAssetType.includes("FII") || rawAssetType.includes("FUNDO")) {
          normalizedAssetType = "FII";
        } else if (rawAssetType.includes("CRIPTO") || rawAssetType.includes("CRYPTO")) {
          normalizedAssetType = "CRYPTO";
        } else if (rawAssetType === "STOCK" || rawAssetType === "ACAO" || rawAssetType === "AÇÃO") {
          normalizedAssetType = "STOCK";
        } else {
          normalizedAssetType = rawAssetType || "OTHER";
        }

        return {
          user_id: user.id,
          ticker: ticker.toUpperCase(),
          asset_name: assetName,
          asset_type: normalizedAssetType,
          transaction_type: mappedType,
          quantity,
          price,
          fees,
          transaction_date: transactionDate,
        };
      }).filter(t => t.ticker && t.quantity > 0 && t.price >= 0);

      if (transactionsToInsert.length === 0) {
        throw new Error("Nenhuma transação válida encontrada na planilha");
      }

      const { error } = await supabase
        .from("investment_transactions")
        .insert(transactionsToInsert);

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: `${transactionsToInsert.length} transações importadas.`,
      });

      loadTransactions();
      const importedTickers = [...new Set(transactionsToInsert.map((t: any) => t.ticker))];
      if (onTransactionsUpdate) onTransactionsUpdate(importedTickers);
    } catch (error: any) {
      toast({
        title: "Erro na importação",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Download template
  const downloadTemplate = () => {
    const template = [
      {
        ticker: "CDB-INTER-110",
        asset_name: "CDB Banco Inter 110% CDI",
        asset_type: "FIXED_INCOME",
        transaction_date: "2024-01-10",
        transaction_type: "buy",
        quantity: 1,
        price: 5000.00,
        fees: 0,
      },
      {
        ticker: "TESOURO-SELIC-2029",
        asset_name: "Tesouro Selic 2029",
        asset_type: "FIXED_INCOME",
        transaction_date: "2024-01-15",
        transaction_type: "buy",
        quantity: 1,
        price: 14500.00,
        fees: 0,
      },
      {
        ticker: "PETR4",
        asset_name: "Petrobras PN",
        asset_type: "STOCK",
        transaction_date: "2024-02-01",
        transaction_type: "buy",
        quantity: 100,
        price: 35.50,
        fees: 5.00,
      },
      {
        ticker: "HGLG11",
        asset_name: "CSHG Logística FII",
        asset_type: "FII",
        transaction_date: "2024-02-15",
        transaction_type: "buy",
        quantity: 10,
        price: 165.00,
        fees: 0,
      },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "template_investimentos.xlsx");
  };

  const [valueInputMode, setValueInputMode] = useState<"total" | "unit">("total");

  useEffect(() => {
    if (editingTransaction) {
      const isFixed = editingTransaction.asset_type === "FIXED_INCOME";
      const totalAmountVal = (editingTransaction.quantity * editingTransaction.price).toFixed(2);
      
      let category = "CDB";
      let rate = "";
      let issuer = "";
      let dueDate = "";

      if (editingTransaction.notes) {
        const parts = editingTransaction.notes.split(" | ");
        parts.forEach((p: string) => {
          if (p.startsWith("Categoria: ")) category = p.replace("Categoria: ", "");
          if (p.startsWith("Taxa: ")) rate = p.replace("Taxa: ", "");
          if (p.startsWith("Emissor: ")) issuer = p.replace("Emissor: ", "");
          if (p.startsWith("Vencimento: ")) dueDate = p.replace("Vencimento: ", "");
        });
      }

      setTransactionData({
        ...editingTransaction,
        transaction_date: format(new Date(editingTransaction.transaction_date), 'yyyy-MM-dd'),
        quantity: editingTransaction.quantity.toString(),
        price: editingTransaction.price.toString(),
        fees: editingTransaction.fees ? editingTransaction.fees.toString() : "",
        total_amount: totalAmountVal,
        fixed_income_category: category,
        fixed_income_rate: rate,
        fixed_income_issuer: issuer,
        fixed_income_due_date: dueDate,
      });

      setValueInputMode(editingTransaction.quantity === 1 ? "total" : "unit");
      setIsDialogOpen(true);
    } else {
      // Reset form when not editing
      setTransactionData({
        ticker: "",
        asset_name: "",
        asset_type: "FIXED_INCOME",
        fixed_income_category: "CDB",
        fixed_income_rate: "",
        fixed_income_issuer: "",
        fixed_income_due_date: "",
        total_amount: "",
        transaction_date: new Date().toISOString().split("T")[0],
        transaction_type: "buy",
        quantity: "1",
        price: "",
        fees: "",
      });
      setValueInputMode("total");
    }
  }, [editingTransaction]);


  const handleDelete = async (id: string, ticker?: string) => {
    try {
      const { error } = await supabase
        .from("investment_transactions")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Transação excluída com sucesso",
      });

      loadTransactions();
      if (onTransactionsUpdate) {
        onTransactionsUpdate(ticker ? [ticker] : undefined);
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTransactionData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setTransactionData((prev: any) => ({ ...prev, [name]: value }));
  };
  
  const handleTickerSelect = (ticker: { symbol: string; name: string }) => {
    setTransactionData((prev: any) => ({ 
      ...prev,
      ticker: ticker.symbol,
      asset_name: ticker.name
    }));
  };

  // Função para buscar e salvar dados do yfinance para um ticker
  const fetchAndSaveYfinanceData = async (ticker: string) => {
    try {
      // Formatar ticker para yfinance
      const yfinanceTicker = ticker.match(/^[A-Z]{4}\d{1,2}$/) 
        ? `${ticker}.SA` 
        : (ticker.endsWith(".SA") ? ticker : `${ticker}.SA`);

      // Verificar se já existe no banco
      const { data: existing } = await supabase
        .from("financial_assets")
        .select("ticker")
        .eq("ticker", yfinanceTicker)
        .single();

      if (existing) {
        console.log(`Ativo ${yfinanceTicker} já existe no banco.`);
        return;
      }

      // Buscar dados via Edge Function
      const { data, error } = await supabase.functions.invoke("yfinance-data", {
        body: { tickers: [yfinanceTicker] },
      });

      if (error) throw error;

      if (data?.assets && data.assets.length > 0) {
        const asset = data.assets[0];
        
        // Salvar no banco usando a função bulk_upsert_assets
        const assetData = [{
          ticker: asset.ticker,
          name: asset.nome,
          sector: asset.setor,
          current_price: asset.preco_atual,
          dividends_12m: asset.dividendos_12m,
          price_history: asset.historico_precos,
          dividend_history: asset.historico_dividendos
        }];

        await supabase.rpc("bulk_upsert_assets", {
          assets_data: assetData
        });

        console.log(`Dados do ativo ${yfinanceTicker} salvos com sucesso.`);
      }
    } catch (err) {
      console.warn(`Erro ao buscar dados yfinance para ${ticker}:`, err);
    }
  };

  // Função para verificar e limpar dados de ativos não utilizados
  const cleanupUnusedAssetData = async (deletedTicker: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Verificar se ainda existem transações com este ticker
      const { data: remainingTransactions } = await supabase
        .from("investment_transactions")
        .select("id")
        .eq("user_id", user.id)
        .eq("ticker", deletedTicker)
        .limit(1);

      // Se não houver mais transações com este ticker, podemos manter os dados
      // pois outros usuários podem usar. Mas registramos o log.
      if (!remainingTransactions || remainingTransactions.length === 0) {
        console.log(`Nenhuma transação restante para ${deletedTicker}. Dados mantidos no financial_assets para outros usuários.`);
      }
    } catch (err) {
      console.warn(`Erro ao verificar cleanup para ${deletedTicker}:`, err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const isFixedIncome = transactionData.asset_type === "FIXED_INCOME";
      let finalTicker = (transactionData.ticker || "").trim().toUpperCase();
      let finalAssetName = (transactionData.asset_name || "").trim();
      let finalQuantity = parseFloat(transactionData.quantity);
      let finalPrice = parseFloat(transactionData.price);
      let notes = "";

      if (isFixedIncome) {
        if (!finalAssetName) {
          finalAssetName = transactionData.fixed_income_category || "Título de Renda Fixa";
        }

        if (!finalTicker) {
          finalTicker = generateFixedIncomeTicker(finalAssetName, transactionData.fixed_income_category);
        }

        if (valueInputMode === "total" || isNaN(finalQuantity) || isNaN(finalPrice)) {
          const totalAmt = parseFloat(transactionData.total_amount || transactionData.price);
          if (isNaN(totalAmt) || totalAmt <= 0) {
            throw new Error("Por favor, informe o valor da aplicação em Renda Fixa.");
          }
          finalQuantity = 1;
          finalPrice = totalAmt;
        }

        const notesParts = [];
        if (transactionData.fixed_income_category) notesParts.push(`Categoria: ${transactionData.fixed_income_category}`);
        if (transactionData.fixed_income_rate) notesParts.push(`Taxa: ${transactionData.fixed_income_rate}`);
        if (transactionData.fixed_income_issuer) notesParts.push(`Emissor: ${transactionData.fixed_income_issuer}`);
        if (transactionData.fixed_income_due_date) notesParts.push(`Vencimento: ${transactionData.fixed_income_due_date}`);
        if (notesParts.length > 0) {
          notes = notesParts.join(" | ");
        }
      } else {
        if (!finalTicker) {
          throw new Error("Por favor, informe o código/ticker do ativo.");
        }
        if (isNaN(finalQuantity) || isNaN(finalPrice)) {
          throw new Error("Quantidade e Preço devem ser números válidos.");
        }
        if (!finalAssetName) {
          finalAssetName = finalTicker;
        }
      }

      const dataToSubmit: any = {
        user_id: user.id,
        ticker: finalTicker,
        asset_name: finalAssetName,
        asset_type: transactionData.asset_type,
        category: isFixedIncome ? (transactionData.fixed_income_category || "FIXED_INCOME") : null,
        notes: notes || null,
        transaction_date: transactionData.transaction_date,
        transaction_type: transactionData.transaction_type,
        quantity: finalQuantity,
        price: finalPrice,
        fees: transactionData.fees ? parseFloat(transactionData.fees) : 0,
      };

      let error;
      if (editingTransaction) {
        dataToSubmit.id = editingTransaction.id;
        const { error: updateError } = await supabase
          .from("investment_transactions")
          .update(dataToSubmit)
          .eq("id", editingTransaction.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from("investment_transactions")
          .insert([dataToSubmit]);
        error = insertError;

        // Se for ação ou FII, buscar dados da bolsa em background
        if (!insertError && !isFixedIncome) {
          fetchAndSaveYfinanceData(dataToSubmit.ticker);
        }
      }

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: isFixedIncome
          ? `Operação em Renda Fixa ${editingTransaction ? 'atualizada' : 'registrada'} com sucesso.`
          : `Transação ${editingTransaction ? 'atualizada' : 'adicionada'}.`,
      });

      setIsDialogOpen(false);
      setEditingTransaction(null);
      loadTransactions();
      if (onTransactionsUpdate) {
        onTransactionsUpdate([dataToSubmit.ticker]);
      }
    } catch (error: any) {
      toast({
        title: `Erro ao ${editingTransaction ? 'atualizar' : 'adicionar'} transação`,
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const isFixedIncomeForm = transactionData.asset_type === "FIXED_INCOME";
  const isEquityForm = transactionData.asset_type === "STOCK" || transactionData.asset_type === "FII";

  const handleApplySuggestion = (sug: typeof quickSuggestions[0]) => {
    setTransactionData((prev: any) => ({
      ...prev,
      asset_type: "FIXED_INCOME",
      asset_name: sug.name,
      ticker: sug.ticker,
      fixed_income_category: sug.category,
      fixed_income_rate: sug.rate,
      fixed_income_issuer: sug.issuer,
    }));
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Carregando...</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <CardTitle className="text-base sm:text-lg">Transações Manuais de Investimento</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Cadastre títulos de Renda Fixa (CDB, Tesouro, LCI), Ações, FIIs ou Criptomoedas
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleExcelImport}
                ref={fileInputRef}
                className="hidden"
              />
              <Button
                size="sm"
                variant="outline"
                className="text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-950/40"
                onClick={() => setIsB3ImporterOpen(true)}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Extrato B3 (Excel/CSV)
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={downloadTemplate}
                title="Baixar planilha com exemplos de Renda Fixa e Ações"
              >
                <Download className="h-4 w-4 mr-2" />
                Template
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
              >
                <Upload className="h-4 w-4 mr-2" />
                {importing ? "Importando..." : "Importar Excel"}
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={(isOpen) => {
                setIsDialogOpen(isOpen);
                if (!isOpen) setEditingTransaction(null);
              }}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={() => setEditingTransaction(null)}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-lg flex items-center gap-2">
                      {isFixedIncomeForm && <Landmark className="h-5 w-5 text-amber-500" />}
                      {isEquityForm && <TrendingUp className="h-5 w-5 text-emerald-500" />}
                      {!isFixedIncomeForm && !isEquityForm && <DollarSign className="h-5 w-5 text-blue-500" />}
                      {editingTransaction ? 'Editar' : 'Adicionar'} {isFixedIncomeForm ? 'Título de Renda Fixa' : isEquityForm ? 'Ação / FII' : 'Investimento'}
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                      {isFixedIncomeForm 
                        ? 'Preencha o valor aplicado no CDB, Tesouro Direto, LCI ou Debênture.'
                        : 'Preencha os detalhes da sua operação em ações, fundos imobiliários ou outros ativos.'}
                    </DialogDescription>
                  </DialogHeader>

                  {/* Seletor didático de Categoria Principal */}
                  <div className="pt-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                      Selecione a Categoria
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setTransactionData((prev: any) => ({ ...prev, asset_type: "FIXED_INCOME" }))}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-center transition-all ${
                          isFixedIncomeForm
                            ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 font-medium shadow-sm"
                            : "border-border hover:bg-muted/50 text-muted-foreground"
                        }`}
                      >
                        <Landmark className={`h-5 w-5 mb-1 ${isFixedIncomeForm ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`} />
                        <span className="text-xs">Renda Fixa</span>
                        <span className="text-[10px] opacity-75">CDB, Tesouro, LCI</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTransactionData((prev: any) => ({ ...prev, asset_type: prev.asset_type === "FII" ? "FII" : "STOCK" }))}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-center transition-all ${
                          isEquityForm
                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 font-medium shadow-sm"
                            : "border-border hover:bg-muted/50 text-muted-foreground"
                        }`}
                      >
                        <TrendingUp className={`h-5 w-5 mb-1 ${isEquityForm ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`} />
                        <span className="text-xs">Ações & FIIs</span>
                        <span className="text-[10px] opacity-75">Bolsa B3</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTransactionData((prev: any) => ({ ...prev, asset_type: prev.asset_type === "CRYPTO" ? "CRYPTO" : "OTHER" }))}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-center transition-all ${
                          !isFixedIncomeForm && !isEquityForm
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 font-medium shadow-sm"
                            : "border-border hover:bg-muted/50 text-muted-foreground"
                        }`}
                      >
                        <Coins className={`h-5 w-5 mb-1 ${!isFixedIncomeForm && !isEquityForm ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"}`} />
                        <span className="text-xs">Cripto & Outros</span>
                        <span className="text-[10px] opacity-75">Bitcoin, etc.</span>
                      </button>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    {/* FORMULÁRIO EXCLUSIVO DE RENDA FIXA */}
                    {isFixedIncomeForm && (
                      <div className="space-y-3.5 bg-amber-500/5 dark:bg-amber-500/10 p-3.5 rounded-lg border border-amber-500/20">
                        {/* Sugestões rápidas de 1 clique */}
                        {!editingTransaction && (
                          <div className="space-y-1.5">
                            <span className="text-[11px] font-medium text-amber-900 dark:text-amber-300 flex items-center gap-1">
                              <Sparkles className="h-3 w-3" /> Sugestões rápidas (clique para preencher):
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {quickSuggestions.map((sug) => (
                                <button
                                  key={sug.ticker}
                                  type="button"
                                  onClick={() => handleApplySuggestion(sug)}
                                  className="text-[11px] bg-background hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-300 dark:border-amber-800 rounded-md px-2 py-0.5 text-foreground transition-colors"
                                >
                                  {sug.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="fixed_income_category" className="text-xs font-medium">Categoria do Título *</Label>
                            <Select
                              value={transactionData.fixed_income_category || "CDB"}
                              onValueChange={(val) => {
                                handleSelectChange('fixed_income_category', val);
                                if (!transactionData.asset_name || transactionData.asset_name.includes("Título")) {
                                  handleSelectChange('asset_name', val);
                                }
                              }}
                            >
                              <SelectTrigger className="h-9 text-xs mt-1">
                                <SelectValue placeholder="Selecione o tipo" />
                              </SelectTrigger>
                              <SelectContent>
                                {fixedIncomeCategories.map((c) => (
                                  <SelectItem key={c.value} value={c.value} className="text-xs">
                                    {c.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor="transaction_type" className="text-xs font-medium">Tipo de Operação *</Label>
                            <Select
                              value={transactionData.transaction_type}
                              onValueChange={(val) => handleSelectChange('transaction_type', val)}
                            >
                              <SelectTrigger className="h-9 text-xs mt-1">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="buy" className="text-xs">Aplicação (Investir)</SelectItem>
                                <SelectItem value="sell" className="text-xs">Resgate (Retirar)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="asset_name" className="text-xs font-medium">Nome / Descrição do Título *</Label>
                          <Input
                            id="asset_name"
                            name="asset_name"
                            placeholder="Ex: CDB Banco Inter 110% CDI ou Tesouro Selic 2029"
                            value={transactionData.asset_name}
                            onChange={(e) => {
                              handleInputChange(e);
                              if (!transactionData.ticker) {
                                setTransactionData((prev: any) => ({
                                  ...prev,
                                  ticker: generateFixedIncomeTicker(e.target.value, prev.fixed_income_category)
                                }));
                              }
                            }}
                            className="h-9 text-xs mt-1"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <div className="flex items-center justify-between">
                              <Label htmlFor="total_amount" className="text-xs font-medium">
                                {valueInputMode === "total" ? "Valor da Aplicação (R$) *" : "Preço Unitário (R$) *"}
                              </Label>
                              <button
                                type="button"
                                onClick={() => setValueInputMode(valueInputMode === "total" ? "unit" : "total")}
                                className="text-[10px] text-amber-700 dark:text-amber-400 hover:underline"
                              >
                                {valueInputMode === "total" ? "Informar qtd e preço" : "Informar valor total"}
                              </button>
                            </div>
                            {valueInputMode === "total" ? (
                              <Input
                                id="total_amount"
                                name="total_amount"
                                type="number"
                                step="any"
                                placeholder="Ex: 5000.00"
                                value={transactionData.total_amount || transactionData.price}
                                onChange={(e) => {
                                  handleInputChange(e);
                                  setTransactionData((prev: any) => ({
                                    ...prev,
                                    price: e.target.value,
                                    quantity: "1",
                                    total_amount: e.target.value
                                  }));
                                }}
                                className="h-9 text-xs mt-1 font-semibold"
                                required
                              />
                            ) : (
                              <div className="grid grid-cols-2 gap-2 mt-1">
                                <Input
                                  name="quantity"
                                  type="number"
                                  step="any"
                                  placeholder="Qtd (ex: 1)"
                                  value={transactionData.quantity}
                                  onChange={handleInputChange}
                                  className="h-9 text-xs"
                                  required
                                />
                                <Input
                                  name="price"
                                  type="number"
                                  step="any"
                                  placeholder="Preço (R$)"
                                  value={transactionData.price}
                                  onChange={handleInputChange}
                                  className="h-9 text-xs"
                                  required
                                />
                              </div>
                            )}
                          </div>

                          <div>
                            <div className="flex items-center justify-between">
                              <Label htmlFor="fixed_income_rate" className="text-xs font-medium">Rentabilidade / Taxa de Referência</Label>
                              <span className="text-[10px] text-muted-foreground">Ex: 110% CDI, IPCA + 6%</span>
                            </div>
                            <Input
                              id="fixed_income_rate"
                              name="fixed_income_rate"
                              placeholder="Ex: 100% CDI, 110% CDI, IPCA + 6%, 12% a.a."
                              value={transactionData.fixed_income_rate || ""}
                              onChange={handleInputChange}
                              className="h-9 text-xs mt-1"
                            />
                            {/* Atalhos rápidos de indexador */}
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {["100% CDI", "110% CDI", "IPCA + 6%", "12% a.a."].map((preset) => (
                                <button
                                  key={preset}
                                  type="button"
                                  onClick={() => setTransactionData((prev) => ({ ...prev, fixed_income_rate: preset }))}
                                  className="text-[10px] px-1.5 py-0.5 rounded border bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  {preset}
                                </button>
                              ))}
                            </div>
                            {/* Feedback didático do indexador interpretado */}
                            {transactionData.fixed_income_rate && (
                              <div className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20 p-1.5 rounded border border-emerald-500/20">
                                💡 Calculando rendimento por <strong>{parseFixedIncomeRate(transactionData.fixed_income_rate, transactionData.asset_name, transactionData.fixed_income_category).label}</strong> com base na data da aplicação.
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="fixed_income_issuer" className="text-xs font-medium">Emissor / Banco (Opcional)</Label>
                            <Input
                              id="fixed_income_issuer"
                              name="fixed_income_issuer"
                              placeholder="Ex: Banco Inter, Tesouro Nacional"
                              value={transactionData.fixed_income_issuer || ""}
                              onChange={handleInputChange}
                              className="h-9 text-xs mt-1"
                            />
                          </div>

                          <div>
                            <Label htmlFor="ticker" className="text-xs font-medium">Código / Sigla Identificadora</Label>
                            <Input
                              id="ticker"
                              name="ticker"
                              placeholder="Auto-gerado (ex: CDB-INTER)"
                              value={transactionData.ticker}
                              onChange={handleInputChange}
                              className="h-9 text-xs mt-1 font-mono uppercase"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <Label htmlFor="transaction_date" className="text-xs font-medium">Data da Operação *</Label>
                            <Input
                              id="transaction_date"
                              name="transaction_date"
                              type="date"
                              value={transactionData.transaction_date}
                              onChange={handleInputChange}
                              className="h-9 text-xs mt-1"
                              required
                            />
                          </div>

                          <div>
                            <Label htmlFor="fixed_income_due_date" className="text-xs font-medium">Vencimento (Opcional)</Label>
                            <Input
                              id="fixed_income_due_date"
                              name="fixed_income_due_date"
                              type="date"
                              value={transactionData.fixed_income_due_date || ""}
                              onChange={handleInputChange}
                              className="h-9 text-xs mt-1"
                            />
                          </div>

                          <div>
                            <Label htmlFor="fees" className="text-xs font-medium">Taxas / IOF (R$)</Label>
                            <Input
                              id="fees"
                              name="fees"
                              type="number"
                              step="any"
                              placeholder="0.00"
                              value={transactionData.fees}
                              onChange={handleInputChange}
                              className="h-9 text-xs mt-1"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* FORMULÁRIO DE AÇÕES E FIIs (BOLSA B3) */}
                    {isEquityForm && (
                      <div className="space-y-3.5 bg-muted/40 p-3.5 rounded-lg border">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs font-medium">Tipo de Ativo na Bolsa *</Label>
                            <Select
                              value={transactionData.asset_type}
                              onValueChange={(val) => handleSelectChange('asset_type', val)}
                            >
                              <SelectTrigger className="h-9 text-xs mt-1">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="STOCK" className="text-xs">Ação (Bolsa B3)</SelectItem>
                                <SelectItem value="FII" className="text-xs">Fundo Imobiliário (FII)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor="transaction_type" className="text-xs font-medium">Tipo de Operação *</Label>
                            <Select
                              value={transactionData.transaction_type}
                              onValueChange={(value) => handleSelectChange('transaction_type', value)}
                            >
                              <SelectTrigger className="h-9 text-xs mt-1">
                                <SelectValue placeholder="Selecione o tipo" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="buy" className="text-xs">Compra</SelectItem>
                                <SelectItem value="sell" className="text-xs">Venda</SelectItem>
                                <SelectItem value="split" className="text-xs">Split (Desdobramento)</SelectItem>
                                <SelectItem value="grouping" className="text-xs">Agrupamento</SelectItem>
                                <SelectItem value="bonus" className="text-xs">Bonificação</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="ticker" className="text-xs font-medium">Código do Ativo (Ticker B3) *</Label>
                          <div className="mt-1">
                            <TickerSearch
                              value={transactionData.ticker}
                              onValueChange={(search) => handleInputChange({ target: { name: 'ticker', value: search } } as any)}
                              onSelect={handleTickerSelect}
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="asset_name" className="text-xs font-medium">Nome da Empresa / Fundo</Label>
                          <Input
                            id="asset_name"
                            name="asset_name"
                            placeholder="Preenchido automaticamente ao buscar"
                            value={transactionData.asset_name}
                            onChange={handleInputChange}
                            className="h-9 text-xs mt-1"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="quantity" className="text-xs font-medium">Quantidade de Cotas / Ações *</Label>
                            <Input
                              id="quantity"
                              name="quantity"
                              type="number"
                              step="any"
                              placeholder="Ex: 100"
                              value={transactionData.quantity}
                              onChange={handleInputChange}
                              className="h-9 text-xs mt-1"
                              required
                            />
                          </div>

                          <div>
                            <Label htmlFor="price" className="text-xs font-medium">Preço Unitário (R$) *</Label>
                            <Input
                              id="price"
                              name="price"
                              type="number"
                              step="any"
                              placeholder="Ex: 34.50"
                              value={transactionData.price}
                              onChange={handleInputChange}
                              className="h-9 text-xs mt-1"
                              required
                            />
                          </div>
                        </div>

                        {/* Total calculado em tempo real */}
                        {parseFloat(transactionData.quantity) > 0 && parseFloat(transactionData.price) > 0 && (
                          <div className="text-xs text-muted-foreground bg-background p-2 rounded border flex justify-between items-center">
                            <span>Total Estimado da Operação:</span>
                            <span className="font-semibold text-foreground">
                              R$ {(parseFloat(transactionData.quantity) * parseFloat(transactionData.price)).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="transaction_date" className="text-xs font-medium">Data da Negociação *</Label>
                            <Input
                              id="transaction_date"
                              name="transaction_date"
                              type="date"
                              value={transactionData.transaction_date}
                              onChange={handleInputChange}
                              className="h-9 text-xs mt-1"
                              required
                            />
                          </div>

                          <div>
                            <Label htmlFor="fees" className="text-xs font-medium">Taxas de Corretagem / B3 (R$)</Label>
                            <Input
                              id="fees"
                              name="fees"
                              type="number"
                              step="any"
                              placeholder="0.00"
                              value={transactionData.fees}
                              onChange={handleInputChange}
                              className="h-9 text-xs mt-1"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* FORMULÁRIO DE CRIPTO E OUTROS */}
                    {!isFixedIncomeForm && !isEquityForm && (
                      <div className="space-y-3.5 bg-muted/40 p-3.5 rounded-lg border">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs font-medium">Tipo de Ativo *</Label>
                            <Select
                              value={transactionData.asset_type}
                              onValueChange={(val) => handleSelectChange('asset_type', val)}
                            >
                              <SelectTrigger className="h-9 text-xs mt-1">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="CRYPTO" className="text-xs">Criptomoeda</SelectItem>
                                <SelectItem value="OTHER" className="text-xs">Outro Ativo</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor="transaction_type" className="text-xs font-medium">Operação *</Label>
                            <Select
                              value={transactionData.transaction_type}
                              onValueChange={(value) => handleSelectChange('transaction_type', value)}
                            >
                              <SelectTrigger className="h-9 text-xs mt-1">
                                <SelectValue placeholder="Selecione o tipo" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="buy" className="text-xs">Compra / Aporte</SelectItem>
                                <SelectItem value="sell" className="text-xs">Venda / Resgate</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="ticker" className="text-xs font-medium">Código / Símbolo *</Label>
                            <Input
                              id="ticker"
                              name="ticker"
                              placeholder="Ex: BTC, ETH"
                              value={transactionData.ticker}
                              onChange={handleInputChange}
                              className="h-9 text-xs mt-1 uppercase"
                              required
                            />
                          </div>

                          <div>
                            <Label htmlFor="asset_name" className="text-xs font-medium">Nome do Ativo</Label>
                            <Input
                              id="asset_name"
                              name="asset_name"
                              placeholder="Ex: Bitcoin"
                              value={transactionData.asset_name}
                              onChange={handleInputChange}
                              className="h-9 text-xs mt-1"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="quantity" className="text-xs font-medium">Quantidade *</Label>
                            <Input
                              id="quantity"
                              name="quantity"
                              type="number"
                              step="any"
                              placeholder="Ex: 0.05"
                              value={transactionData.quantity}
                              onChange={handleInputChange}
                              className="h-9 text-xs mt-1"
                              required
                            />
                          </div>

                          <div>
                            <Label htmlFor="price" className="text-xs font-medium">Preço Unitário (R$) *</Label>
                            <Input
                              id="price"
                              name="price"
                              type="number"
                              step="any"
                              placeholder="Ex: 350000.00"
                              value={transactionData.price}
                              onChange={handleInputChange}
                              className="h-9 text-xs mt-1"
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="transaction_date" className="text-xs font-medium">Data *</Label>
                            <Input
                              id="transaction_date"
                              name="transaction_date"
                              type="date"
                              value={transactionData.transaction_date}
                              onChange={handleInputChange}
                              className="h-9 text-xs mt-1"
                              required
                            />
                          </div>

                          <div>
                            <Label htmlFor="fees" className="text-xs font-medium">Taxas (R$)</Label>
                            <Input
                              id="fees"
                              name="fees"
                              type="number"
                              step="any"
                              placeholder="0.00"
                              value={transactionData.fees}
                              onChange={handleInputChange}
                              className="h-9 text-xs mt-1"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <DialogFooter className="pt-2">
                      <DialogClose asChild>
                        <Button type="button" variant="outline" size="sm">
                          Cancelar
                        </Button>
                      </DialogClose>
                      <Button type="submit" size="sm">
                        {editingTransaction ? 'Salvar Alterações' : 'Salvar Transação'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <InvestmentTransactionHistory
            transactions={transactions}
            onEdit={setEditingTransaction}
            onDelete={(id) => handleDelete(id)}
          />
        </CardContent>
      </Card>

      {/* B3 Statement Importer Dialog */}
      <B3StatementImporterDialog
        open={isB3ImporterOpen}
        onOpenChange={setIsB3ImporterOpen}
        onImportSuccess={(tickers) => {
          loadTransactions();
          if (onTransactionsUpdate) onTransactionsUpdate(tickers);
        }}
      />
    </div>
  );
}
