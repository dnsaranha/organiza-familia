import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Loader2,
  ExternalLink,
  Filter,
} from "lucide-react";
import * as XLSX from "xlsx";

export interface ParsedB3Transaction {
  id: string;
  selected: boolean;
  date: string; // YYYY-MM-DD
  ticker: string;
  assetName: string;
  assetType: "STOCK" | "FII" | "FIXED_INCOME" | "CRYPTO" | "OTHER";
  operationType: "buy" | "sell";
  quantity: number;
  price: number;
  totalValue: number;
  institution?: string;
}

interface B3StatementImporterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportSuccess?: (importedTickers: string[]) => void;
}

// Normalize B3 Brazilian numbers (e.g., "1.250,50" -> 1250.50)
function parseBRLNumber(val: any): number {
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const str = String(val).trim();
  // Remove currency symbol and spaces
  const clean = str.replace(/[R$\s]/g, "");
  // Check if Brazilian format: has comma as decimal
  if (clean.includes(",") && clean.includes(".")) {
    // e.g. 1.250,50 -> 1250.50
    const normalized = clean.replace(/\./g, "").replace(",", ".");
    const num = parseFloat(normalized);
    return isNaN(num) ? 0 : num;
  }
  if (clean.includes(",")) {
    // e.g. 1250,50 -> 1250.50
    const normalized = clean.replace(",", ".");
    const num = parseFloat(normalized);
    return isNaN(num) ? 0 : num;
  }
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

// Convert various date representations into YYYY-MM-DD
function parseB3Date(val: any): string {
  if (!val) return new Date().toISOString().split("T")[0];

  // If it is a number from Excel serial date
  if (typeof val === "number") {
    try {
      const parsed = XLSX.SSF.parse_date_code(val);
      if (parsed && parsed.y && parsed.m && parsed.d) {
        return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
      }
    } catch (e) {
      // fallback
    }
  }

  const str = String(val).trim();
  // Format DD/MM/YYYY or DD-MM-YYYY
  const brMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (brMatch) {
    const d = brMatch[1].padStart(2, "0");
    const m = brMatch[2].padStart(2, "0");
    const y = brMatch[3];
    return `${y}-${m}-${d}`;
  }

  // Format YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, "0");
    const d = isoMatch[3].padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split("T")[0];
  }

  return new Date().toISOString().split("T")[0];
}

// Clean and normalize ticker symbols (e.g. PETR4F -> PETR4, extract from "PETR4 - PETROLEO...")
function normalizeB3Ticker(raw: string): { ticker: string; isFixed: boolean } {
  if (!raw) return { ticker: "", isFixed: false };
  const clean = String(raw).trim().toUpperCase();

  // Check if Tesouro Direto
  if (clean.includes("TESOURO")) {
    const sanitized = clean
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9]/g, "-")
      .replace(/-+/g, "-")
      .substring(0, 25);
    return { ticker: sanitized, isFixed: true };
  }

  // Check if CDB / LCI / LCA
  if (clean.startsWith("CDB") || clean.startsWith("LCI") || clean.startsWith("LCA")) {
    return { ticker: clean.replace(/\s+/g, "-").substring(0, 20), isFixed: true };
  }

  // Match 4 letters + 1-2 digits (e.g. PETR4, MXRF11, VALE3, HGLG11)
  const tickerMatch = clean.match(/\b([A-Z]{4}\d{1,2})F?\b/);
  if (tickerMatch) {
    return { ticker: tickerMatch[1], isFixed: false };
  }

  // General fallback: first token without spaces
  const firstToken = clean.split(/[\s\-]/)[0];
  // If ends with 'F' and has standard format, remove 'F' (fractional market)
  if (/^[A-Z]{4}\d{1,2}F$/.test(firstToken)) {
    return { ticker: firstToken.slice(0, -1), isFixed: false };
  }

  return { ticker: firstToken, isFixed: false };
}

// Determine Asset Category
function detectAssetType(ticker: string, isFixed: boolean): "STOCK" | "FII" | "FIXED_INCOME" | "OTHER" {
  if (isFixed) return "FIXED_INCOME";
  if (ticker.endsWith("11")) return "FII";
  if (
    ticker.endsWith("3") ||
    ticker.endsWith("4") ||
    ticker.endsWith("5") ||
    ticker.endsWith("6") ||
    ticker.endsWith("34")
  ) {
    return "STOCK";
  }
  return "STOCK";
}

export function B3StatementImporterDialog({
  open,
  onOpenChange,
  onImportSuccess,
}: B3StatementImporterDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedB3Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    await processFile(selectedFile);
  };

  const processFile = async (inputFile: File) => {
    setLoading(true);
    try {
      const buffer = await inputFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Convert worksheet to raw array of rows
      const rawRows = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: "",
        blankrows: false,
      }) as any[][];

      if (rawRows.length === 0) {
        throw new Error("O arquivo selecionado está vazio.");
      }

      // Find header row by matching known B3 keywords
      let headerRowIndex = -1;
      let colMap: Record<string, number> = {};

      for (let i = 0; i < Math.min(rawRows.length, 15); i++) {
        const row = rawRows[i].map((c) => String(c).trim().toLowerCase());
        const dateCol = row.findIndex((c) =>
          c.includes("data") && (c.includes("negócio") || c.includes("negocio") || c.includes("opera") || c.includes("moviment") || c === "data")
        );
        const tickerCol = row.findIndex((c) =>
          c.includes("código") || c.includes("codigo") || c.includes("ativo") || c.includes("ticker") || c.includes("produto") || c === "papel"
        );
        const typeCol = row.findIndex((c) =>
          c.includes("tipo") || c.includes("movimentação") || c.includes("movimentacao") || c.includes("operação") || c.includes("operacao") || c === "c/v"
        );
        const qtyCol = row.findIndex((c) =>
          c.includes("quantidade") || c.includes("qtde") || c.includes("qtd")
        );

        if ((dateCol !== -1 || row.some(c => c.includes("data"))) && (tickerCol !== -1 || qtyCol !== -1)) {
          headerRowIndex = i;
          colMap = {
            date: dateCol,
            ticker: tickerCol,
            type: typeCol,
            qty: qtyCol,
            price: row.findIndex((c) => c.includes("preço") || c.includes("preco") || c.includes("unitário") || c.includes("unitario")),
            total: row.findIndex((c) => c.includes("valor") && (c.includes("opera") || c.includes("total") || c.includes("líquido") || c.includes("liquido") || c === "valor" || c === "valor (r$)")),
            institution: row.findIndex((c) => c.includes("instituição") || c.includes("instituicao") || c.includes("corretora")),
          };
          break;
        }
      }

      // If no recognized B3 header row found, try standard fallback (header at row 0)
      if (headerRowIndex === -1) {
        headerRowIndex = 0;
        const row = rawRows[0].map((c) => String(c).trim().toLowerCase());
        colMap = {
          date: row.findIndex((c) => c.includes("data") || c.includes("date")),
          ticker: row.findIndex((c) => c.includes("código") || c.includes("codigo") || c.includes("ticker") || c.includes("ativo")),
          type: row.findIndex((c) => c.includes("tipo") || c.includes("type") || c === "c/v"),
          qty: row.findIndex((c) => c.includes("quant") || c.includes("qtd")),
          price: row.findIndex((c) => c.includes("preço") || c.includes("preco") || c.includes("price")),
          total: row.findIndex((c) => c.includes("valor") || c.includes("total")),
          institution: row.findIndex((c) => c.includes("institu") || c.includes("corretora")),
        };
      }

      const results: ParsedB3Transaction[] = [];

      for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (!row || row.length === 0) continue;

        const rawDate = colMap.date !== -1 ? row[colMap.date] : row[0];
        const rawTicker = colMap.ticker !== -1 ? row[colMap.ticker] : row[1];
        const rawType = colMap.type !== -1 ? row[colMap.type] : row[2];
        const rawQty = colMap.qty !== -1 ? row[colMap.qty] : row[3];
        const rawPrice = colMap.price !== -1 ? row[colMap.price] : row[4];
        const rawTotal = colMap.total !== -1 ? row[colMap.total] : row[5];
        const rawInst = colMap.institution !== -1 ? row[colMap.institution] : "";

        if (!rawTicker && !rawDate) continue;

        const { ticker, isFixed } = normalizeB3Ticker(String(rawTicker || ""));
        if (!ticker || ticker.length < 2) continue;

        // Determine operation (buy vs sell)
        const typeStr = String(rawType || "Compra").toLowerCase();
        let operationType: "buy" | "sell" = "buy";
        if (
          typeStr.includes("venda") ||
          typeStr.trim() === "v" ||
          typeStr.includes("resgate") ||
          typeStr.includes("alienação")
        ) {
          operationType = "sell";
        }

        const quantity = parseBRLNumber(rawQty);
        let price = parseBRLNumber(rawPrice);
        let totalVal = parseBRLNumber(rawTotal);

        if (price <= 0 && totalVal > 0 && quantity > 0) {
          price = totalVal / quantity;
        } else if (totalVal <= 0 && price > 0 && quantity > 0) {
          totalVal = price * quantity;
        }

        if (quantity <= 0 || (price <= 0 && totalVal <= 0)) {
          continue; // Skip invalid entries
        }

        const parsedDate = parseB3Date(rawDate);
        const assetType = detectAssetType(ticker, isFixed);

        results.push({
          id: `b3-${i}-${ticker}-${Date.now()}`,
          selected: true,
          date: parsedDate,
          ticker,
          assetName: String(rawTicker || ticker),
          assetType,
          operationType,
          quantity,
          price: Number(price.toFixed(4)),
          totalValue: Number(totalVal.toFixed(2)),
          institution: rawInst ? String(rawInst).trim() : undefined,
        });
      }

      if (results.length === 0) {
        throw new Error(
          "Nenhuma operação de compra/venda identificada no arquivo. Verifique se exportou o extrato de Negociação ou Movimentação da B3."
        );
      }

      setParsedRows(results);
      toast({
        title: "Arquivo processado com sucesso!",
        description: `${results.length} operações identificadas prontas para importação.`,
      });
    } catch (err: any) {
      toast({
        title: "Erro ao ler extrato da B3",
        description: err.message || "Não foi possível interpretar o formato da planilha.",
        variant: "destructive",
      });
      setParsedRows([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = (select: boolean) => {
    setParsedRows((prev) => prev.map((r) => ({ ...r, selected: select })));
  };

  const toggleRow = (id: string) => {
    setParsedRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r))
    );
  };

  const handleConfirmImport = async () => {
    const selectedRows = parsedRows.filter((r) => r.selected);
    if (selectedRows.length === 0) {
      toast({
        title: "Nenhuma operação selecionada",
        description: "Selecione pelo menos uma linha para importar.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado.");

      const transactionsToInsert = selectedRows.map((r) => ({
        user_id: user.id,
        ticker: r.ticker,
        asset_name: r.assetName || r.ticker,
        asset_type: r.assetType,
        transaction_type: r.operationType,
        quantity: r.quantity,
        price: r.price,
        fees: 0,
        transaction_date: r.date,
        notes: r.institution ? `Importado B3 | Instituição: ${r.institution}` : "Importado da Área do Investidor B3",
      }));

      const { error } = await supabase
        .from("investment_transactions")
        .insert(transactionsToInsert);

      if (error) throw error;

      const importedTickers = [...new Set(selectedRows.map((r) => r.ticker))];

      toast({
        title: "Importação concluída!",
        description: `${selectedRows.length} operações da B3 foram cadastradas na sua carteira.`,
      });

      if (onImportSuccess) {
        onImportSuccess(importedTickers);
      }

      // Reset and close
      setFile(null);
      setParsedRows([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Erro ao salvar transações",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = parsedRows.filter((r) => r.selected).length;
  const buyCount = parsedRows.filter((r) => r.selected && r.operationType === "buy").length;
  const sellCount = parsedRows.filter((r) => r.selected && r.operationType === "sell").length;
  const uniqueTickers = [...new Set(parsedRows.filter((r) => r.selected).map((r) => r.ticker))];
  const totalFinancial = parsedRows
    .filter((r) => r.selected)
    .reduce((sum, r) => sum + r.totalValue, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-4 sm:p-6">
        <DialogHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg">
                  Importar Extrato Oficial da B3
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Carregue a planilha de Negociação ou Movimentação da Área do Investidor B3 (.xlsx ou .csv)
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground gap-1"
              onClick={() => setShowTutorial(!showTutorial)}
            >
              <HelpCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Como Baixar na B3?</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Step-by-step Tutorial Collapsible */}
        {showTutorial && (
          <div className="bg-muted/50 border border-border p-3.5 rounded-lg text-xs space-y-2">
            <div className="flex items-center justify-between font-semibold text-foreground">
              <span>Como obter o arquivo na B3:</span>
              <a
                href="https://investidor.b3.com.br"
                target="_blank"
                rel="noreferrer"
                className="text-primary inline-flex items-center gap-1 hover:underline text-[11px]"
              >
                Acessar investidor.b3.com.br
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Acesse a <strong>Área do Investidor da B3</strong> com seu Gov.br ou CPF.</li>
              <li>No menu lateral, clique em <strong>Extratos</strong> e depois em <strong>Negociação</strong>.</li>
              <li>Escolha o período desejado (ex.: últimos 12 meses ou personalizado).</li>
              <li>No canto superior direito da tabela, clique em <strong>Exportar (Excel .xlsx ou CSV)</strong>.</li>
              <li>Envie o arquivo baixado no campo abaixo. Nosso sistema lerá automaticamente todos os ativos!</li>
            </ol>
          </div>
        )}

        {/* Upload Box */}
        {parsedRows.length === 0 ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border hover:border-primary/60 bg-muted/20 hover:bg-muted/40 transition-colors rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer space-y-3 my-2"
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Upload className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-sm text-foreground">
                Clique para selecionar ou arraste o arquivo da B3
              </p>
              <p className="text-xs text-muted-foreground">
                Formatos suportados: .xlsx, .xls ou .csv baixados diretamente da B3
              </p>
            </div>
            {loading && (
              <div className="flex items-center gap-2 text-xs text-primary font-medium">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processando operações da B3...
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3 flex-1 flex flex-col min-h-0">
            {/* Quick Stats Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-muted/40 p-2.5 rounded-lg text-xs">
              <div>
                <span className="text-muted-foreground text-[11px] block">Selecionadas:</span>
                <span className="font-bold text-foreground">
                  {selectedCount} de {parsedRows.length} ops
                </span>
              </div>
              <div>
                <span className="text-muted-foreground text-[11px] block">Operações:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {buyCount} compras
                </span>{" "}
                /{" "}
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  {sellCount} vendas
                </span>
              </div>
              <div>
                <span className="text-muted-foreground text-[11px] block">Ativos Únicos:</span>
                <span className="font-bold text-foreground">
                  {uniqueTickers.length} ativos
                </span>
              </div>
              <div>
                <span className="text-muted-foreground text-[11px] block">Volume Total:</span>
                <span className="font-bold text-foreground">
                  {totalFinancial.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </div>
            </div>

            {/* Selection Toolbar */}
            <div className="flex items-center justify-between text-xs px-1">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={() => toggleSelectAll(true)}
                >
                  Marcar Todas
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={() => toggleSelectAll(false)}
                >
                  Desmarcar
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                onClick={() => {
                  setParsedRows([]);
                  setFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              >
                Trocar Arquivo
              </Button>
            </div>

            {/* Table of Parsed Operations */}
            <div className="border rounded-lg overflow-hidden flex-1 min-h-0 flex flex-col">
              <div className="grid grid-cols-12 gap-2 bg-muted/80 p-2 text-[11px] font-semibold text-muted-foreground border-b shrink-0">
                <div className="col-span-1 text-center">Sel.</div>
                <div className="col-span-2">Data</div>
                <div className="col-span-2">Ativo</div>
                <div className="col-span-2">Operação</div>
                <div className="col-span-2 text-right">Qtd.</div>
                <div className="col-span-3 text-right">Preço / Total</div>
              </div>

              <ScrollArea className="flex-1 max-h-[300px]">
                <div className="divide-y text-xs">
                  {parsedRows.map((row) => (
                    <div
                      key={row.id}
                      onClick={() => toggleRow(row.id)}
                      className={`grid grid-cols-12 gap-2 p-2 items-center hover:bg-muted/30 transition-colors cursor-pointer ${
                        !row.selected ? "opacity-50 bg-muted/10" : ""
                      }`}
                    >
                      <div className="col-span-1 flex justify-center" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={row.selected}
                          onCheckedChange={() => toggleRow(row.id)}
                        />
                      </div>
                      <div className="col-span-2 font-mono text-[11px] text-muted-foreground">
                        {row.date.split("-").reverse().join("/")}
                      </div>
                      <div className="col-span-2 font-semibold font-mono text-xs">
                        <Badge variant="outline" className="px-1.5 py-0 text-[11px]">
                          {row.ticker}
                        </Badge>
                      </div>
                      <div className="col-span-2">
                        {row.operationType === "buy" ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                            Compra
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 font-semibold text-[11px]">
                            Venda
                          </span>
                        )}
                      </div>
                      <div className="col-span-2 text-right font-mono tabular-nums">
                        {row.quantity}
                      </div>
                      <div className="col-span-3 text-right">
                        <div className="font-semibold tabular-nums text-foreground">
                          {row.totalValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </div>
                        <div className="text-[10px] text-muted-foreground tabular-nums">
                          {row.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} un.
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}

        <DialogFooter className="flex flex-row justify-between sm:justify-between items-center pt-3 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>

          {parsedRows.length > 0 && (
            <Button
              size="sm"
              onClick={handleConfirmImport}
              disabled={saving || selectedCount === 0}
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importando {selectedCount} operações...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Confirmar Importação ({selectedCount})
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
