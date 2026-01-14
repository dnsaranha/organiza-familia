import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowUpRight, ArrowDownRight, Clock, AlertTriangle, User, Calendar as CalendarIcon, ChevronUp, MoreHorizontal, Pencil, Trash2, Loader2, Upload, Download, FileDown, FileUp } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import * as XLSX from 'xlsx';
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ErrorBoundary from "./ErrorBoundary";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { Tables, TablesInsert } from "@/integrations/supabase/types";
import { TransactionForm } from "./TransactionForm";
import { expenseCategories, incomeCategories } from "@/lib/budget-categories";
import { getCategoryIcon, getCategoryColor } from "@/lib/category-icons";
import { useUserCategories } from "@/hooks/useUserCategories";

type Transaction = Tables<'transactions'>;

interface FamilyGroup {
  id: string;
  name: string;
}

interface TransactionListProps {
  onTransactionChange: () => void;
}

interface ImportedRow {
  ID?: string;
  'Data/Hora'?: string | number;
  Data?: string | number;
  Valor?: string | number;
  Categoria?: string;
  Descrição?: string;
  Tipo?: 'income' | 'expense' | 'receita' | 'despesa';
}

// Helper function to infer category from description
const inferCategoryFromDescription = (description: string, type: 'income' | 'expense'): string => {
  const desc = description.toLowerCase();
  
  // Income categories inference
  if (type === 'income') {
    if (desc.includes('salario') || desc.includes('salário') || desc.includes('pgto') || desc.includes('pagamento')) return 'Salário';
    if (desc.includes('freelance') || desc.includes('serviço') || desc.includes('servico')) return 'Freelance';
    if (desc.includes('dividendo') || desc.includes('rendimento') || desc.includes('juros') || desc.includes('investimento')) return 'Investimentos';
    if (desc.includes('presente') || desc.includes('gift')) return 'Presente';
    if (desc.includes('bonus') || desc.includes('bônus')) return 'Bônus';
    if (desc.includes('aluguel')) return 'Aluguel Recebido';
    return 'Outros';
  }
  
  // Expense categories inference
  if (desc.includes('aluguel') || desc.includes('rent') || desc.includes('condominio') || desc.includes('condomínio')) return 'Aluguel';
  if (desc.includes('agua') || desc.includes('água') || desc.includes('saneamento')) return 'Água';
  if (desc.includes('luz') || desc.includes('energia') || desc.includes('eletric')) return 'Luz';
  if (desc.includes('internet') || desc.includes('wifi') || desc.includes('net') || desc.includes('banda larga')) return 'Internet';
  if (desc.includes('telefone') || desc.includes('celular') || desc.includes('tel') || desc.includes('mobile')) return 'Telefone';
  if (desc.includes('mercado') || desc.includes('supermercado') || desc.includes('compras') || desc.includes('pão de açúcar') || desc.includes('carrefour') || desc.includes('extra')) return 'Mercado';
  if (desc.includes('restaurante') || desc.includes('lanche') || desc.includes('pizza') || desc.includes('hamburger') || desc.includes('ifood') || desc.includes('rappi')) return 'Restaurante';
  if (desc.includes('uber') || desc.includes('99') || desc.includes('taxi') || desc.includes('táxi') || desc.includes('combustivel') || desc.includes('combustível') || desc.includes('gasolina') || desc.includes('posto')) return 'Transporte';
  if (desc.includes('farmacia') || desc.includes('farmácia') || desc.includes('drogaria') || desc.includes('medic') || desc.includes('hospital') || desc.includes('consulta') || desc.includes('exame')) return 'Saúde';
  if (desc.includes('netflix') || desc.includes('spotify') || desc.includes('prime') || desc.includes('cinema') || desc.includes('show') || desc.includes('ingresso') || desc.includes('lazer')) return 'Entretenimento';
  if (desc.includes('roupa') || desc.includes('shopping') || desc.includes('loja') || desc.includes('compra')) return 'Compras';
  if (desc.includes('curso') || desc.includes('escola') || desc.includes('faculdade') || desc.includes('livro') || desc.includes('udemy') || desc.includes('alura')) return 'Educação';
  if (desc.includes('viagem') || desc.includes('hotel') || desc.includes('passagem') || desc.includes('airbnb') || desc.includes('booking')) return 'Viagem';
  if (desc.includes('investimento') || desc.includes('aplicação') || desc.includes('aplicacao') || desc.includes('ação') || desc.includes('acao') || desc.includes('fii')) return 'Investimentos';
  if (desc.includes('poupança') || desc.includes('poupanca') || desc.includes('reserva')) return 'Poupança';
  
  return 'Outros';
};

// Helper function to parse value removing currency symbols
const parseValueFromString = (value: string | number): number => {
  if (typeof value === 'number') return Math.abs(value);
  
  const strValue = String(value).trim();
  
  // Check if it's negative (has minus sign or parentheses)
  const isNegative = strValue.startsWith('-') || strValue.startsWith('(');
  
  // Remove R$, $, spaces, and currency symbols
  let cleanValue = strValue
    .replace(/R\$\s*/gi, '')
    .replace(/\$\s*/g, '')
    .replace(/[()]/g, '')
    .replace(/-/g, '')
    .trim();
  
  // Handle Brazilian format (1.234,56) vs American format (1,234.56)
  // If there's a comma followed by exactly 2 digits at the end, it's Brazilian format
  if (/,\d{2}$/.test(cleanValue)) {
    // Brazilian format: remove dots (thousands), convert comma to dot (decimal)
    cleanValue = cleanValue.replace(/\./g, '').replace(',', '.');
  } else if (/\.\d{2}$/.test(cleanValue)) {
    // American format: remove commas (thousands)
    cleanValue = cleanValue.replace(/,/g, '');
  } else {
    // Fallback: remove all dots and commas except the last one
    const parts = cleanValue.split(/[.,]/);
    if (parts.length > 1) {
      const lastPart = parts.pop();
      cleanValue = parts.join('') + '.' + lastPart;
    }
  }
  
  const parsed = parseFloat(cleanValue);
  return isNaN(parsed) ? 0 : Math.abs(parsed);
};

// Helper function to parse date in multiple formats
const parseDateString = (dateStr: string | number): Date | null => {
  if (!dateStr) return null;
  
  // Handle Excel serial date number
  if (typeof dateStr === 'number') {
    // Excel serial date: days since 1899-12-30
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + dateStr * 24 * 60 * 60 * 1000);
    if (!isNaN(date.getTime())) return date;
  }
  
  const str = String(dateStr).trim();
  
  // Try ISO format first (yyyy-MM-dd or yyyy-MM-ddTHH:mm:ss)
  let date = new Date(str);
  if (!isNaN(date.getTime()) && str.includes('-') && str.length >= 10) return date;
  
  // Try dd/mm/yyyy format
  const ddmmyyyy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
  const match = str.match(ddmmyyyy);
  if (match) {
    const [, day, month, year] = match;
    date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) return date;
  }
  
  // Try dd/mm/yy format
  const ddmmyy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/;
  const matchYY = str.match(ddmmyy);
  if (matchYY) {
    const [, day, month, year] = matchYY;
    const fullYear = parseInt(year) > 50 ? 1900 + parseInt(year) : 2000 + parseInt(year);
    date = new Date(fullYear, parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) return date;
  }
  
  return null;
};

export const TransactionList = ({ onTransactionChange }: TransactionListProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const { userCategories } = useUserCategories();

  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importGroupId, setImportGroupId] = useState<string | null>(null);

  const [groups, setGroups] = useState<FamilyGroup[]>([]);
  const [budgetFilter, setBudgetFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [isOpen, setIsOpen] = useState(true);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from('transactions').select('*');

      if (budgetFilter === 'personal') {
        query = query.is('group_id', null);
      } else if (budgetFilter !== 'all') {
        query = query.eq('group_id', budgetFilter);
      }

      if (dateRange?.from) {
        query = query.gte('date', dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        query = query.lte('date', dateRange.to.toISOString());
      }

      query = query.order('date', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      setTransactions(data || []);
    } catch (err: unknown) {
      console.error("Erro ao buscar transações:", err);
      setError("Não foi possível carregar as transações.");
    } finally {
      setLoading(false);
    }
  }, [budgetFilter, dateRange]);

  useEffect(() => {
    const fetchGroups = async () => {
      if (!user) return;
      const { data, error } = await supabase.rpc('get_user_groups')
      if (error) console.error("Erro ao buscar grupos para filtro:", error);
      else setGroups(data as FamilyGroup[] || []);
    };
    fetchGroups();

    const savedFilters = localStorage.getItem('transactionFilters');
    if (savedFilters) {
      try {
        const { budget, date } = JSON.parse(savedFilters) as { budget: string; date: { from?: string, to?: string }};
        if (budget) setBudgetFilter(budget);
        if (date) setDateRange({ from: date.from ? new Date(date.from) : undefined, to: date.to ? new Date(date.to) : undefined });
      } catch (e) {
        console.error("Failed to parse filters from localStorage", e);
        localStorage.removeItem('transactionFilters');
      }
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      fetchTransactions();
      localStorage.setItem('transactionFilters', JSON.stringify({ budget: budgetFilter, date: dateRange }));
    }
  }, [user?.id, budgetFilter, dateRange, fetchTransactions]);

  const handleExport = () => {
    const dataToExport = transactions.map(t => ({ 'ID': t.id, 'Data/Hora': format(new Date(t.date), "yyyy-MM-dd'T'HH:mm:ss"), 'Descrição': t.description, 'Categoria': t.category, 'Valor': t.amount, 'Tipo': t.type }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transações");
    XLSX.writeFile(workbook, "historico_transacoes.xlsx");
  };

  const handleImportClick = () => {
    setImportGroupId(null); // Reset to personal by default
    setShowImportDialog(true);
  };
  
  const handleSelectFile = () => {
    importFileInputRef.current?.click();
  };
  
  const handleDownloadTemplate = () => {
    // Create template with example rows
    const templateData = [
      { 
        'Data': '15/01/2024', 
        'Descrição': 'Salário mensal', 
        'Categoria': 'Salário', 
        'Valor': 'R$ 5.000,00', 
        'Tipo': 'receita' 
      },
      { 
        'Data': '16/01/2024', 
        'Descrição': 'Compras no supermercado', 
        'Categoria': 'Mercado', 
        'Valor': 'R$ 450,50', 
        'Tipo': 'despesa' 
      },
    ];
    
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 12 },  // Data
      { wch: 30 },  // Descrição
      { wch: 15 },  // Categoria
      { wch: 15 },  // Valor
      { wch: 10 },  // Tipo
    ];
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Modelo");
    XLSX.writeFile(workbook, "modelo_importacao_transacoes.xlsx");
    
    toast.success("Arquivo modelo baixado!", { 
      description: "Use este modelo para importar suas transações." 
    });
    setShowImportDialog(false);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const importedData: ImportedRow[] = XLSX.utils.sheet_to_json(worksheet);

        let importedCount = 0, ignoredCount = 0;

        const { data: existingTransactions, error: fetchError } = await supabase.from('transactions').select('id, date, amount, category');
        if (fetchError) throw fetchError;

        const existingIdSet = new Set(existingTransactions.map(t => t.id));
        const existingCompositeKeySet = new Set(existingTransactions.map(t => `${new Date(t.date).toISOString()}|${t.amount}|${t.category}`));
        const newTransactions: TablesInsert<'transactions'>[] = [];

        for (const row of importedData) {
          // Get date from Data or Data/Hora field
          const dateStr = row['Data'] || row['Data/Hora'];
          if (!dateStr || !row.Valor) { ignoredCount++; continue; }
          
          // Check for existing ID
          if (row.ID && existingIdSet.has(row.ID)) { ignoredCount++; continue; }
          
          // Parse date with multiple format support
          const transactionDate = parseDateString(dateStr);
          if (!transactionDate) { ignoredCount++; continue; }
          
          // Parse value removing currency symbols
          const transactionValue = parseValueFromString(row.Valor);
          if (isNaN(transactionValue) || transactionValue === 0) { ignoredCount++; continue; }
          
          // Determine transaction type
          const rawType = row.Tipo?.toLowerCase();
          let transactionType: 'income' | 'expense' = 'expense';
          if (rawType === 'income' || rawType === 'receita') {
            transactionType = 'income';
          }
          
          // Auto-categorize if category is empty
          let category = row.Categoria?.trim();
          if (!category) {
            const description = row.Descrição || '';
            category = inferCategoryFromDescription(description, transactionType);
          }
          
          const compositeKey = `${transactionDate.toISOString()}|${transactionValue}|${category}`;
          if (existingCompositeKeySet.has(compositeKey)) { ignoredCount++; continue; }

          const transactionData: TablesInsert<'transactions'> = { 
            date: transactionDate.toISOString(), 
            description: row.Descrição || null, 
            category: category, 
            amount: transactionValue, 
            type: transactionType,
            group_id: importGroupId 
          };
          
          // Only include ID if it was provided
          if (row.ID) {
            transactionData.id = row.ID;
          }
          
          newTransactions.push(transactionData);
        }

        if (newTransactions.length > 0) {
          const { error: insertError } = await supabase.from('transactions').insert(newTransactions.map(t => ({...t, user_id: user?.id })));
          if (insertError) throw insertError;
          importedCount = newTransactions.length;
        }

        toast.success("Importação Concluída", { description: `${importedCount} registros importados, ${ignoredCount} ignorados.` });
        onTransactionChange();
        fetchTransactions();

      } catch (err: unknown) {
        console.error("Erro ao importar arquivo:", err);
        toast.error("Erro na Importação", { description: "Ocorreu um erro ao processar o arquivo." });
      } finally {
        if(importFileInputRef.current) importFileInputRef.current.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
  const formatDate = (dateString: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(dateString));

  const handleDelete = async () => {
    if (!transactionToDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', transactionToDelete.id);
      if (error) throw error;
      toast.success("Transação excluída! 🗑️", { description: "A transação foi removida com sucesso." });
      onTransactionChange();
      setTransactionToDelete(null);
    } catch (err: unknown) {
      console.error("Erro ao excluir transação:", err);
      toast.error("Erro ao excluir transação", { description: "Não foi possível remover a transação." });
    } finally {
      setIsDeleting(false);
    }
  };

  const renderSkeleton = () => ( <div className="space-y-4"> {[...Array(3)].map((_, i) => ( <div key={i} className="flex items-center justify-between p-3"> <div className="flex items-center gap-3"> <Skeleton className="h-10 w-10 rounded-full" /> <div className="space-y-2"> <Skeleton className="h-4 w-[150px]" /> <Skeleton className="h-3 w-[100px]" /> </div> </div> <Skeleton className="h-6 w-[80px]" /> </div> ))} </div> );
  const fallbackUI = ( <Card><CardHeader><CardTitle>Erro</CardTitle></CardHeader><CardContent><Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Erro ao carregar o histórico</AlertTitle><AlertDescription>Não foi possível carregar o histórico. Tente novamente.</AlertDescription></Alert></CardContent></Card> );

  return (
    <ErrorBoundary fallback={fallbackUI}>
      <Card className="bg-gradient-card shadow-card border">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" /><CardTitle className="text-base sm:text-lg">Histórico de Transações</CardTitle></div>
              <CollapsibleTrigger asChild><Button variant="ghost" size="sm" className="w-9 p-0"><ChevronUp className={`h-4 w-4 transition-transform duration-200 ${isOpen ? '' : 'rotate-180'}`} /><span className="sr-only">Toggle</span></Button></CollapsibleTrigger>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
               <div className="flex flex-col gap-4 mb-4">
                <div className="flex gap-2 justify-start md:justify-end">
                   <input type="file" ref={importFileInputRef} className="hidden" onChange={handleFileChange} accept=".xlsx, .xls" />
                  <Button variant="outline" size="sm" onClick={handleImportClick}><Upload className="h-4 w-4 md:mr-2" /><span className="hidden md:inline">Importar</span></Button>
                  <Button variant="outline" size="sm" onClick={handleExport} disabled={transactions.length === 0}><Download className="h-4 w-4 md:mr-2" /><span className="hidden md:inline">Exportar</span></Button>
                </div>
                <div className="flex flex-col md:flex-row gap-2 w-full">
                  <Select value={budgetFilter} onValueChange={setBudgetFilter}><SelectTrigger className="w-full md:w-[240px]"><SelectValue placeholder="Filtrar por orçamento" /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="personal">Pessoal</SelectItem>{groups.map(group => ( <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem> ))}</SelectContent></Select>
                  <Popover><PopoverTrigger asChild><Button id="date" variant={"outline"} className="w-full md:w-auto justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4" />{dateRange?.from ? (dateRange.to ? (`${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}`) : format(dateRange.from, "LLL dd, y")) : (<span>Selecione</span>)}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} /></PopoverContent></Popover>
                </div>
              </div>

              <ScrollArea className="h-72"><div className="space-y-4 pr-4">
                {loading ? renderSkeleton() : error ? <div className="text-center py-8 text-destructive flex flex-col items-center gap-2"><AlertTriangle className="h-8 w-8" /><p>{error}</p></div> : transactions.length === 0 ? <div className="text-center py-8 text-muted-foreground"><p>Nenhuma transação encontrada.</p></div> : (
                    transactions.map((transaction) => {
                      const iconName = getCategoryIcon(transaction.category, userCategories.map(c => ({ name: c.name, icon: c.icon, color: c.color })));
                      const iconColor = getCategoryColor(transaction.category, userCategories.map(c => ({ name: c.name, icon: c.icon, color: c.color })));
                      const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.CircleDot;
                      
                      return (
                    <div key={transaction.id} className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-muted/30 hover:bg-muted/50">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <div 
                          className="rounded-lg p-1.5 sm:p-2 flex-shrink-0 flex items-center justify-center"
                          style={{ backgroundColor: iconColor }}
                        >
                          <IconComponent className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                        </div>
                        <div className="min-w-0 flex-1 mr-2">
                          <p className="font-medium text-foreground text-xs sm:text-base truncate">{transaction.description || transaction.category}</p>
                          <div className="flex items-center gap-1 sm:gap-2 mt-0.5 sm:mt-1 flex-wrap">
                            <Badge variant="secondary" className="text-[10px] sm:text-xs h-4 sm:h-auto px-1 sm:px-2.5">{transaction.category}</Badge>
                            <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap" translate="no">{formatDate(transaction.date)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                        <div className="text-right">
                          <p className={`font-semibold text-xs sm:text-base ${transaction.type === 'income' ? 'text-success' : 'text-expense'}`} translate="no">
                            {transaction.type === 'income' ? '+' : '-'} {formatCurrency(transaction.amount)}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-7 w-7 sm:h-8 sm:w-8 p-0">
                              <span className="sr-only">Menu</span>
                              <MoreHorizontal className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => setEditingTransaction(transaction)}><Pencil className="mr-2 h-4 w-4" /><span>Editar</span></DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onSelect={() => setTransactionToDelete(transaction)}><Trash2 className="mr-2 h-4 w-4" /><span>Excluir</span></DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                      );
                    })
                )}
              </div></ScrollArea>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      <Dialog open={!!editingTransaction} onOpenChange={(open) => !open && setEditingTransaction(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Transação</DialogTitle></DialogHeader>
          <TransactionForm
            transactionToEdit={editingTransaction}
            onSave={() => {
              setEditingTransaction(null);
              onTransactionChange();
              fetchTransactions(); // Adicionado para re-buscar a lista
            }}
            onCancel={() => setEditingTransaction(null)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!transactionToDelete} onOpenChange={(open) => !open && setTransactionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Você tem certeza?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita e excluirá permanentemente a transação.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Importar Transações</DialogTitle>
            <DialogDescription>
              Escolha o grupo onde as transações serão importadas e depois selecione a opção desejada.
            </DialogDescription>
          </DialogHeader>
          
          {/* Group Selection */}
          <div className="space-y-3 py-2">
            <label className="text-sm font-medium">Importar para:</label>
            <Select value={importGroupId || 'personal'} onValueChange={(v) => setImportGroupId(v === 'personal' ? null : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o destino" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">Pessoal</SelectItem>
                {groups.map(g => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex flex-col gap-4 py-4">
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={handleDownloadTemplate}
            >
              <FileDown className="h-8 w-8 text-primary" />
              <div className="text-center">
                <p className="font-medium">Baixar Arquivo Modelo</p>
                <p className="text-xs text-muted-foreground">
                  Obtenha o modelo para preencher suas transações
                </p>
              </div>
            </Button>
            
            <Button 
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={handleSelectFile}
            >
              <FileUp className="h-8 w-8 text-primary" />
              <div className="text-center">
                <p className="font-medium">Importar Arquivo</p>
                <p className="text-xs text-muted-foreground">
                  Selecione um arquivo Excel (.xlsx) existente
                </p>
              </div>
            </Button>
          </div>
          <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
            <p className="font-medium mb-1">Dicas de importação:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Data aceita formatos: dd/mm/aaaa ou aaaa-mm-dd</li>
              <li>Valor pode incluir R$ ou $ (serão removidos)</li>
              <li>Tipo: "receita" ou "despesa"</li>
              <li>Categoria vazia será inferida pela descrição</li>
            </ul>
          </div>
        </DialogContent>
      </Dialog>
    </ErrorBoundary>
  );
};