
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useBudgetScope } from "@/contexts/BudgetScopeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Target, Plus, Trash2, Edit, Wallet, PiggyBank, Car, Home, Plane, GraduationCap, Heart, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Goal {
  id: string; user_id: string; group_id: string | null; title: string; description: string | null; target_amount: number; current_amount: number; deadline: string | null; category: string; icon: string; color: string; created_at: string; updated_at: string;
}

interface HistoryData {
    date: string;
    value: number;
    cumulative: number;
}

const GOAL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = { wallet: Wallet, piggy: PiggyBank, car: Car, home: Home, plane: Plane, education: GraduationCap, health: Heart, target: Target };
const GOAL_COLORS = [ { name: "Azul", value: "hsl(var(--primary))" }, { name: "Verde", value: "hsl(142, 76%, 36%)" }, { name: "Roxo", value: "hsl(262, 83%, 58%)" }, { name: "Laranja", value: "hsl(25, 95%, 53%)" }, { name: "Rosa", value: "hsl(330, 81%, 60%)" }, { name: "Ciano", value: "hsl(186, 94%, 41%)" } ];
const GOAL_CATEGORIES = [ "Reserva de Emergência", "Viagem", "Veículo", "Imóvel", "Educação", "Saúde", "Aposentadoria", "Outro" ];

const GoalHistoryChart = ({ goalId, color }: { goalId: string, color: string }) => {
    const [historyData, setHistoryData] = useState<HistoryData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase.from('transactions').select('date, amount').eq('goal_id', goalId).order('date', { ascending: true });
                if (error) throw error;
                let cumulativeAmount = 0;
                const processedData = data.map(tx => {
                    cumulativeAmount += tx.amount;
                    return { date: format(new Date(tx.date), 'dd/MM'), value: tx.amount, cumulative: cumulativeAmount };
                });
                setHistoryData(processedData);
            } catch (error: any) {
                console.error("Error fetching goal history:", error);
                toast.error("Erro ao carregar o histórico da meta.");
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, [goalId]);

    if (loading) return <div className="h-24 flex items-center justify-center text-sm">Carregando gráfico...</div>;
    if (historyData.length === 0) return <div className="h-24 flex items-center justify-center text-sm text-muted-foreground">Nenhum histórico de contribuição.</div>;

    return (
        <div className="h-40 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historyData} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                    <defs>
                        <linearGradient id={`colorCumulative-${goalId}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
                            <stop offset="95%" stopColor={color} stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value/1000}k`} />
                    <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '0.5rem' }} formatter={(value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)} />
                    <Area type="monotone" dataKey="cumulative" stroke={color} fillOpacity={1} fill={`url(#colorCumulative-${goalId})`} strokeWidth={2} name="Acumulado" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default function GoalsPage() {
  const { user } = useAuth();
  const { scope } = useBudgetScope();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [isAddingValue, setIsAddingValue] = useState<string | null>(null);
  const [addValue, setAddValue] = useState("");
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "", description: "", target_amount: "", current_amount: "", deadline: "", category: "Reserva de Emergência", icon: "piggy", color: "hsl(var(--primary))",
  });

  useEffect(() => { if (user) { fetchGoals(); } }, [user, scope]);

  const fetchGoals = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase.from("savings_goals").select("*").order("created_at", { ascending: false });
      if (scope === "personal") { query = query.is("group_id", null).eq("user_id", user.id); } else { query = query.eq("group_id", scope); }
      const { data, error } = await query;
      if (error) throw error;
      setGoals((data as Goal[]) || []);
    } catch (error: any) {
      console.error("Error fetching goals:", error);
      toast.error("Erro ao carregar metas");
    } finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!formData.title || !formData.target_amount) { toast.error("Preencha o título e valor da meta"); return; }
    try {
      const goalData = { user_id: user.id, group_id: scope === "personal" ? null : scope, title: formData.title, description: formData.description || null, target_amount: parseFloat(formData.target_amount), current_amount: parseFloat(formData.current_amount) || 0, deadline: formData.deadline || null, category: formData.category, icon: formData.icon, color: formData.color };
      if (editingGoal) {
        const { error } = await supabase.from("savings_goals").update(goalData).eq("id", editingGoal.id);
        if (error) throw error;
        toast.success("Meta atualizada!");
      } else {
        const { error } = await supabase.from("savings_goals").insert(goalData);
        if (error) throw error;
        toast.success("Meta criada!");
      }
      setIsDialogOpen(false); setEditingGoal(null); resetForm(); fetchGoals();
    } catch (error: any) { console.error("Error saving goal:", error); toast.error("Erro ao salvar meta"); }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("savings_goals").delete().eq("id", id);
      if (error) throw error;
      toast.success("Meta excluída!"); fetchGoals();
    } catch (error: any) { console.error("Error deleting goal:", error); toast.error("Erro ao excluir meta"); }
  };

  const handleAddValue = async (goalId: string) => {
    if (!addValue || !user) return;
    const valueToAdd = parseFloat(addValue);
    if (isNaN(valueToAdd) || valueToAdd <= 0) return toast.error("Insira um valor válido.");
    try {
        const goal = goals.find((g) => g.id === goalId);
        if (!goal) return;
        const { error: transactionError } = await supabase.from('transactions').insert({ user_id: user.id, group_id: goal.group_id, goal_id: goal.id, type: 'expense' as const, category: 'Metas', description: `Contribuição para: ${goal.title}`, amount: valueToAdd, date: new Date().toISOString() });
        if (transactionError) throw transactionError;
        const newAmount = goal.current_amount + valueToAdd;
        const { error: goalError } = await supabase.from("savings_goals").update({ current_amount: newAmount }).eq("id", goalId);
        if (goalError) throw goalError;
        toast.success("Valor adicionado!");
        setIsAddingValue(null); setAddValue(""); fetchGoals();
        if (expandedGoalId === goalId) { setExpandedGoalId(null); setTimeout(() => setExpandedGoalId(goalId), 50); }
    } catch (error: any) { console.error("Error adding value to goal:", error); toast.error("Erro ao adicionar valor."); }
  };

  const resetForm = () => setFormData({ title: "", description: "", target_amount: "", current_amount: "", deadline: "", category: "Reserva de Emergência", icon: "piggy", color: "hsl(var(--primary))" });
  const openEditDialog = (goal: Goal) => { setEditingGoal(goal); setFormData({ title: goal.title, description: goal.description || "", target_amount: goal.target_amount.toString(), current_amount: goal.current_amount.toString(), deadline: goal.deadline || "", category: goal.category, icon: goal.icon, color: goal.color, }); setIsDialogOpen(true); };
  const formatCurrency = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  const getProgress = (current: number, target: number) => target === 0 ? 0 : Math.min((current / target) * 100, 100);

  if (!user) return <div className="flex items-center justify-center min-h-[60vh]"><p className="text-muted-foreground">Faça login para ver suas metas</p></div>;

  return (
    <div className="container mx-auto p-4 pb-20 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Target className="h-6 w-6 text-primary" />Metas de Reserva</h1>
          <p className="text-muted-foreground text-sm">Defina e acompanhe suas metas financeiras</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) { setEditingGoal(null); resetForm(); } }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Nova Meta</Button></DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingGoal ? "Editar Meta" : "Nova Meta"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Título *</Label><Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Ex: Reserva de Emergência"/></div>
              <div><Label>Descrição</Label><Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Opcional"/></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Valor da Meta (R$) *</Label><Input type="number" value={formData.target_amount} onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })} placeholder="10000"/></div>
                <div><Label>Valor Atual (R$)</Label><Input type="number" value={formData.current_amount} onChange={(e) => setFormData({ ...formData, current_amount: e.target.value })} placeholder="0"/></div>
              </div>
              <div><Label>Data Limite</Label><Input type="date" value={formData.deadline} onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}/></div>
              <div><Label>Categoria</Label><Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{GOAL_CATEGORIES.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}</SelectContent></Select></div>
              <div><Label>Ícone</Label><div className="flex gap-2 flex-wrap mt-2">{Object.entries(GOAL_ICONS).map(([key, Icon]) => (<Button key={key} type="button" variant={formData.icon === key ? "default" : "outline"} size="icon" onClick={() => setFormData({ ...formData, icon: key })}><Icon className="h-4 w-4" /></Button>))}</div></div>
              <div><Label>Cor</Label><div className="flex gap-2 flex-wrap mt-2">{GOAL_COLORS.map((color) => (<Button key={color.value} type="button" variant="outline" size="icon" className="relative" style={{ backgroundColor: color.value }} onClick={() => setFormData({ ...formData, color: color.value })}>{formData.color === color.value && (<div className="absolute inset-0 flex items-center justify-center"><div className="w-2 h-2 bg-white rounded-full" /></div>)}</Button>))}</div></div>
            </div>
            <DialogFooter><DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose><Button onClick={handleSubmit}>{editingGoal ? "Salvar" : "Criar"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (<Card key={i} className="animate-pulse"><CardHeader className="h-20 bg-muted rounded-t-lg" /><CardContent className="space-y-3 pt-4"><div className="h-4 bg-muted rounded w-3/4" /><div className="h-3 bg-muted rounded w-full" /><div className="h-6 bg-muted rounded w-1/2" /></CardContent></Card>))}
        </div>
      ) : goals.length === 0 ? (
        <Card className="p-8 text-center"><Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><h3 className="text-lg font-medium mb-2">Nenhuma meta criada</h3><p className="text-muted-foreground mb-4">Crie sua primeira meta de reserva para começar a acompanhar seu progresso</p><Button onClick={() => setIsDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Criar Meta</Button></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => {
            const Icon = GOAL_ICONS[goal.icon] || Target;
            const progress = getProgress(goal.current_amount, goal.target_amount);
            const remaining = goal.target_amount - goal.current_amount;
            const isExpanded = expandedGoalId === goal.id;

            return (
              <Card key={goal.id} className="overflow-hidden flex flex-col">
                <div className="h-2" style={{ backgroundColor: goal.color }} />
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg" style={{ backgroundColor: `${goal.color}20` }}><Icon className="h-5 w-5" style={{ color: goal.color }} /></div>
                      <div><CardTitle className="text-base">{goal.title}</CardTitle><p className="text-xs text-muted-foreground">{goal.category}</p></div>
                    </div>
                    <div className="flex gap-1">
                       <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setExpandedGoalId(isExpanded ? null : goal.id)}>{isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</Button>
                       <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(goal)}><Edit className="h-4 w-4" /></Button>
                       <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(goal.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 flex-1 flex flex-col">
                  {goal.description && (<p className="text-sm text-muted-foreground">{goal.description}</p>)}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm"><span>{formatCurrency(goal.current_amount)}</span><span className="text-muted-foreground">{formatCurrency(goal.target_amount)}</span></div>
                    <Progress value={progress} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground"><span>{progress.toFixed(1)}% completo</span><span>Faltam {formatCurrency(remaining > 0 ? remaining : 0)}</span></div>
                  </div>
                  {goal.deadline && (<p className="text-xs text-muted-foreground">Prazo: {format(new Date(goal.deadline), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>)}
                  {isExpanded && <GoalHistoryChart goalId={goal.id} color={goal.color} />}
                  <div className="flex-grow" />
                  <div className="mt-auto pt-4">
                    {isAddingValue === goal.id ? (
                      <div className="flex gap-2">
                        <Input type="number" placeholder="Valor" value={addValue} onChange={(e) => setAddValue(e.target.value)} className="flex-1" />
                        <Button size="sm" onClick={() => handleAddValue(goal.id)}>OK</Button>
                        <Button size="sm" variant="outline" onClick={() => { setIsAddingValue(null); setAddValue(""); }}>✕</Button>
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" className="w-full" onClick={() => setIsAddingValue(goal.id)}><Plus className="h-4 w-4 mr-2" />Adicionar Valor</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
