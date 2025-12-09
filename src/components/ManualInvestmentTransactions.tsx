import { useState, useEffect } from "react";
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
import { Trash2, Edit, TrendingUp, TrendingDown, PlusCircle } from "lucide-react";
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


  const handleDelete = async (id: string) => {
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
          <div className="flex justify-between items-center">
            <CardTitle className="text-base sm:text-lg">Histórico de Transações</CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={(isOpen) => {
              setIsDialogOpen(isOpen);
              if (!isOpen) setEditingTransaction(null);
            }}>
              <DialogTrigger asChild>
                 <Button size="sm" onClick={() => setEditingTransaction(null)}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Adicionar Transação
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
