import { useState, useMemo } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, Edit, TrendingUp, TrendingDown, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Transaction } from "@/lib/finance-utils";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";

const typeLabels: Record<string, string> = {
  buy: "Compra", sell: "Venda", split: "Split",
  grouping: "Agrupamento", bonus: "Bonificação",
};

interface Props {
  transactions: Transaction[];
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
}

export function InvestmentTransactionHistory({ transactions, onEdit, onDelete }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    let result = transactions;

    // Date range filter
    if (dateRange?.from) {
      result = result.filter((t) => {
        const d = new Date(t.transaction_date);
        if (dateRange.from && d < dateRange.from) return false;
        if (dateRange.to) {
          const endOfDay = new Date(dateRange.to);
          endOfDay.setHours(23, 59, 59, 999);
          if (d > endOfDay) return false;
        }
        return true;
      });
    }

    // Smart search (AND logic with space-separated terms)
    if (searchQuery.trim()) {
      const terms = searchQuery.toLowerCase().trim().split(/\s+/);
      result = result.filter((t) => {
        const dateStr = format(new Date(t.transaction_date), "dd/MM/yyyy");
        const typeLabel = typeLabels[t.transaction_type] || t.transaction_type;
        const total = (t.quantity * t.price).toFixed(2);
        const searchable = [
          t.ticker, t.asset_name, typeLabel, t.transaction_type,
          dateStr, t.quantity.toString(), t.price.toFixed(2),
          total, t.fees.toFixed(2), t.asset_type || "",
        ].join(" ").toLowerCase();

        return terms.every((term) => searchable.includes(term));
      });
    }

    return result;
  }, [transactions, searchQuery, dateRange]);

  // Reset page when filters change
  useMemo(() => { setCurrentPage(1); }, [searchQuery, dateRange, rowsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paginated = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Busca inteligente... (ex: PETR4 compra)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <DateRangePicker date={dateRange} onDateChange={setDateRange} className="sm:w-72" />
      </div>

      {/* Table */}
      <div className="overflow-x-auto overflow-y-auto max-h-[500px]">
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
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {searchQuery || dateRange?.from
                    ? "Nenhuma transação encontrada com os filtros aplicados."
                    : "Nenhuma transação registrada ainda."}
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="text-xs sm:text-sm">
                    {format(new Date(transaction.transaction_date), "dd/MM/yy")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {(transaction.transaction_type === "buy" || transaction.transaction_type === "bonus") && (
                        <TrendingUp className="h-3 w-3 text-success" />
                      )}
                      {transaction.transaction_type === "sell" && (
                        <TrendingDown className="h-3 w-3 text-destructive" />
                      )}
                      <span className="text-xs sm:text-sm">
                        {typeLabels[transaction.transaction_type] || transaction.transaction_type}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-xs sm:text-sm">{transaction.ticker}</TableCell>
                  <TableCell className="text-right text-xs sm:text-sm">{transaction.quantity}</TableCell>
                  <TableCell className="text-right text-xs sm:text-sm">R$ {transaction.price.toFixed(2)}</TableCell>
                  <TableCell className="text-right text-xs sm:text-sm">R$ {(transaction.quantity * transaction.price).toFixed(2)}</TableCell>
                  <TableCell className="text-right text-xs sm:text-sm">R$ {transaction.fees.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => onEdit(transaction)} className="h-8 w-8 p-0">
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
                          <AlertDialogAction onClick={() => onDelete(transaction.id)}>Continuar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Linhas por página:</span>
            <Select value={rowsPerPage.toString()} onValueChange={(v) => setRowsPerPage(Number(v))}>
              <SelectTrigger className="w-[70px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[5, 10, 25, 50, 100].map((n) => (
                  <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span>
              {(currentPage - 1) * rowsPerPage + 1}-{Math.min(currentPage * rowsPerPage, filtered.length)} de {filtered.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline" size="sm" disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm px-2">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline" size="sm" disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
