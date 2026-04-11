import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";

interface InvestmentTransactionFormProps {
  onSuccess?: () => void;
}

export function InvestmentTransactionForm({ onSuccess }: InvestmentTransactionFormProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    ticker: "",
    asset_name: "",
    category: "ACAO",
    transaction_type: "buy",
    quantity: "",
    price: "",
    transaction_date: new Date().toISOString().split('T')[0],
    fees: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("investment_transactions")
        .insert({
          user_id: user.id,
          group_id: null,
          ticker: formData.ticker.toUpperCase(),
          asset_name: formData.asset_name,
          category: formData.category,
          transaction_type: formData.transaction_type,
          quantity: parseFloat(formData.quantity),
          price: parseFloat(formData.price),
          transaction_date: formData.transaction_date,
          fees: formData.fees ? parseFloat(formData.fees) : 0,
          notes: formData.notes || null,
        });

      if (error) throw error;

      const typeLabels: Record<string, string> = { buy: "compra", sell: "venda", split: "split", grouping: "agrupamento", bonus: "bonificação" };
      toast({
        title: "Sucesso!",
        description: `Transação de ${typeLabels[formData.transaction_type] || formData.transaction_type} registrada.`,
      });

      setFormData({
        ticker: "",
        asset_name: "",
        category: "ACAO",
        transaction_type: "buy",
        quantity: "",
        price: "",
        transaction_date: new Date().toISOString().split('T')[0],
        fees: "",
        notes: "",
      });

      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Adicionar Transação</span>
          <span className="sm:hidden">Transação</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Transação de Investimento</DialogTitle>
          <DialogDescription>
            Registre uma compra ou venda de ativo manualmente
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="transaction_type">Tipo de Transação</Label>
            <Select
              value={formData.transaction_type}
              onValueChange={(value) =>
                setFormData({ ...formData, transaction_type: value })
              }
            >
              <SelectTrigger id="transaction_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="buy">Compra</SelectItem>
                <SelectItem value="sell">Venda</SelectItem>
                <SelectItem value="split">Split</SelectItem>
                <SelectItem value="grouping">Agrupamento</SelectItem>
                <SelectItem value="bonus">Bonificação</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticker">Ticker do Ativo *</Label>
            <Input
              id="ticker"
              value={formData.ticker}
              onChange={(e) =>
                setFormData({ ...formData, ticker: e.target.value.toUpperCase() })
              }
              placeholder="Ex: PETR4, ITUB4"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="asset_name">Nome do Ativo *</Label>
            <Input
              id="asset_name"
              value={formData.asset_name}
              onChange={(e) =>
                setFormData({ ...formData, asset_name: e.target.value })
              }
              placeholder="Ex: Petrobras PN"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoria *</Label>
            <Select
              value={formData.category}
              onValueChange={(value) =>
                setFormData({ ...formData, category: value })
              }
            >
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACAO">Ação</SelectItem>
                <SelectItem value="FII">Fundo Imobiliário</SelectItem>
                <SelectItem value="ETF">ETF</SelectItem>
                <SelectItem value="RENDA_FIXA">Renda Fixa</SelectItem>
                <SelectItem value="FUNDO">Fundo de Investimento</SelectItem>
                <SelectItem value="CRIPTO">Criptomoeda</SelectItem>
                <SelectItem value="OUTRO">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantidade *</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: e.target.value })
                }
                placeholder="0"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Preço Unitário *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: e.target.value })
                }
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="transaction_date">Data *</Label>
              <Input
                id="transaction_date"
                type="date"
                value={formData.transaction_date}
                onChange={(e) =>
                  setFormData({ ...formData, transaction_date: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fees">Taxas</Label>
              <Input
                id="fees"
                type="number"
                step="0.01"
                value={formData.fees}
                onChange={(e) =>
                  setFormData({ ...formData, fees: e.target.value })
                }
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Notas sobre a transação..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}