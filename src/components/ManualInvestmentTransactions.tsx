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
import { Trash2, Edit, TrendingUp, TrendingDown, PlusCircle, Upload, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { calculateManualPositions, Transaction } from "@/lib/finance-utils";
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

// Defining the asset types
const assetTypes = [
  { value: "STOCK", label: "Ação" },
  { value: "FII", label: "Fundo Imobiliário" },
  { value: "FIXED_INCOME", label: "Renda Fixa" },
  { value: "CRYPTO", label: "Criptomoeda" },
  { value: "OTHER", label: "Outro" },
];

interface ManualInvestmentTransactionsProps {
  onTransactionsUpdate?: () => void;
}

export function ManualInvestmentTransactions({
  onTransactionsUpdate,
}: ManualInvestmentTransactionsProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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

        return {
          user_id: user.id,
          ticker: ticker.toUpperCase(),
          asset_name: assetName,
          asset_type: assetType.toUpperCase(),
          transaction_type: transactionType === "compra" || transactionType === "buy" ? "buy" : "sell",
          quantity,
          price,
          fees,
          transaction_date: transactionDate,
        };
      }).filter(t => t.ticker && t.quantity > 0 && t.price > 0);

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
      if (onTransactionsUpdate) onTransactionsUpdate();
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
        ticker: "PETR4",
        asset_name: "Petrobras PN",
        asset_type: "STOCK",
        transaction_date: "2024-01-15",
        transaction_type: "buy",
        quantity: 100,
        price: 35.50,
        fees: 5.00,
      },
      {
        ticker: "HGLG11",
        asset_name: "CSHG Logística FII",
        asset_type: "FII",
        transaction_date: "2024-02-01",
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

  useEffect(() => {
    if (editingTransaction) {
      setTransactionData({
        ...editingTransaction,
        transaction_date: format(new Date(editingTransaction.transaction_date), 'yyyy-MM-dd'),
        quantity: editingTransaction.quantity.toString(),
        price: editingTransaction.price.toString(),
        fees: editingTransaction.fees.toString(),
      });
      setIsDialogOpen(true);
    } else {
      // Reset form when not editing
      setTransactionData({
        ticker: "",
        asset_name: "",
        asset_type: "STOCK",
        transaction_date: new Date().toISOString().split("T")[0],
        transaction_type: "buy",
        quantity: "",
        price: "",
        fees: "",
      });
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
        onTransactionsUpdate();
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

      const dataToSubmit: any = {
        user_id: user.id,
        ticker: transactionData.ticker.toUpperCase(),
        asset_name: transactionData.asset_name,
        asset_type: transactionData.asset_type,
        transaction_date: transactionData.transaction_date,
        transaction_type: transactionData.transaction_type,
        quantity: parseFloat(transactionData.quantity),
        price: parseFloat(transactionData.price),
        fees: transactionData.fees ? parseFloat(transactionData.fees) : 0,
      };

      if (isNaN(dataToSubmit.quantity) || isNaN(dataToSubmit.price)) {
        throw new Error("Quantidade e Preço devem ser números.");
      }
      
      // Add the id to the dataToSubmit object when editing
      if (editingTransaction) {
        dataToSubmit.id = editingTransaction.id;
      }

      let error;
      if (editingTransaction) {
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

        // Se é uma nova transação, buscar dados do yfinance em background
        if (!insertError) {
          fetchAndSaveYfinanceData(dataToSubmit.ticker);
        }
      }

      if (error) throw error;

      toast({
        title: `Sucesso!`,
        description: `Transação ${editingTransaction ? 'atualizada' : 'adicionada'}.`,
      });

      setIsDialogOpen(false);
      setEditingTransaction(null);
      loadTransactions();
      if (onTransactionsUpdate) {
        onTransactionsUpdate();
      }
    } catch (error: any) {
      toast({
        title: `Erro ao ${editingTransaction ? 'atualizar' : 'adicionar'} transação`,
        description: error.message,
        variant: "destructive",
      });
    }
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

  const positionSummary = calculateManualPositions(transactions);

  return (
    <div className="space-y-4">
      {positionSummary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Posições Atuais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm">Ticker</TableHead>
                    <TableHead className="text-xs sm:text-sm">Ativo</TableHead>
                    <TableHead className="text-xs sm:text-sm">Tipo</TableHead>
                    <TableHead className="text-xs sm:text-sm text-right">Quantidade</TableHead>
                    <TableHead className="text-xs sm:text-sm text-right">Custo Total</TableHead>
                    <TableHead className="text-xs sm:text-sm text-right">Preço Médio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positionSummary.map((position) => (
                    <TableRow key={position.ticker}>
                      <TableCell className="font-medium text-xs sm:text-sm">
                        {position.ticker}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">{position.asset_name}</TableCell>
                      <TableCell className="text-xs sm:text-sm">{assetTypes.find(at => at.value === position.asset_type)?.label || position.asset_type}</TableCell>
                      <TableCell className="text-right text-xs sm:text-sm">
                        {position.quantity.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-xs sm:text-sm">
                        R$ {position.totalCost.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-xs sm:text-sm">
                        R$ {(position.totalCost / position.quantity).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <CardTitle className="text-base sm:text-lg">Histórico de Transações</CardTitle>
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
                onClick={downloadTemplate}
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
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>{editingTransaction ? 'Editar' : 'Adicionar'} Transação Manual</DialogTitle>
                   <DialogDescription>
                    Preencha os detalhes da sua transação. A busca de ativos retornará resultados da B3, NASDAQ e outras bolsas.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                   <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="ticker" className="text-right">Ticker</Label>
                      <div className="col-span-3">
                        <TickerSearch
                          value={transactionData.ticker}
                          onValueChange={(search) => handleInputChange({ target: { name: 'ticker', value: search } } as any)}
                          onSelect={handleTickerSelect}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="asset_name" className="text-right">Nome do Ativo</Label>
                      <Input id="asset_name" name="asset_name" value={transactionData.asset_name} onChange={handleInputChange} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="asset_type" className="text-right">Tipo de Ativo</Label>
                      <Select name="asset_type" value={transactionData.asset_type} onValueChange={(value) => handleSelectChange('asset_type', value)}>
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Selecione o tipo de ativo" />
                        </SelectTrigger>
                        <SelectContent>
                          {assetTypes.map(type => (
                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="transaction_date" className="text-right">Data</Label>
                      <Input id="transaction_date" name="transaction_date" type="date" value={transactionData.transaction_date} onChange={handleInputChange} className="col-span-3" required />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="transaction_type" className="text-right">Tipo</Label>
                      <Select name="transaction_type" value={transactionData.transaction_type} onValueChange={(value) => handleSelectChange('transaction_type', value)}>
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="buy">Compra</SelectItem>
                          <SelectItem value="sell">Venda</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="quantity" className="text-right">Quantidade</Label>
                      <Input id="quantity" name="quantity" type="number" step="any" value={transactionData.quantity} onChange={handleInputChange} className="col-span-3" required />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="price" className="text-right">Preço (un.)</Label>
                      <Input id="price" name="price" type="number" step="any" value={transactionData.price} onChange={handleInputChange} className="col-span-3" required />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="fees" className="text-right">Taxas</Label>
                      <Input id="fees" name="fees" type="number" step="any" value={transactionData.fees} onChange={handleInputChange} className="col-span-3" />
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="secondary">
                        Cancelar
                      </Button>
                    </DialogClose>
                    <Button type="submit">{editingTransaction ? 'Salvar Alterações' : 'Adicionar'}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma transação registrada ainda.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm min-w-[80px]">Data</TableHead>
                    <TableHead className="text-xs sm:text-sm">Tipo</TableHead>
                    <TableHead className="text-xs sm:text-sm min-w-[80px]">Ticker</TableHead>
                    <TableHead className="text-xs sm:text-sm text-right">Qtd</TableHead>
                    <TableHead className="text-xs sm:text-sm text-right">Preço</TableHead>
                    <TableHead className="text-xs sm:text-sm text-right">Total</TableHead>
                    <TableHead className="text-xs sm:text-sm text-right">Taxas</TableHead>
                    <TableHead className="text-xs sm:text-sm w-[100px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="text-xs sm:text-sm">
                        {format(new Date(transaction.transaction_date), "dd/MM/yy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {transaction.transaction_type === "buy" ? (
                            <TrendingUp className="h-3 w-3 text-success" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-destructive" />
                          )}
                          <span className="text-xs sm:text-sm">
                            {transaction.transaction_type === "buy" ? "Compra" : "Venda"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-xs sm:text-sm">
                        {transaction.ticker}
                      </TableCell>
                      <TableCell className="text-right text-xs sm:text-sm">
                        {transaction.quantity}
                      </TableCell>
                      <TableCell className="text-right text-xs sm:text-sm">
                        R$ {transaction.price.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-xs sm:text-sm">
                        R$ {(transaction.quantity * transaction.price).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-xs sm:text-sm">
                        R$ {transaction.fees.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setEditingTransaction(transaction)} className="h-8 w-8 p-0">
                          <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. Isso excluirá permanentemente a transação.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(transaction.id)}>Continuar</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
