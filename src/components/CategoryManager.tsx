import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Loader2, Settings2, X } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useBudgetScope } from "@/contexts/BudgetScopeContext";
import { toast } from "sonner";
import { AVAILABLE_ICONS, AVAILABLE_COLORS } from "@/lib/category-icons";

interface UserCategory {
  id: string;
  user_id: string;
  group_id: string | null;
  name: string;
  type: "income" | "expense";
  icon: string;
  color: string;
  is_default: boolean;
  keywords: string[] | null;
}

interface CategoryManagerProps {
  onCategoriesChange?: () => void;
}

export const CategoryManager = ({ onCategoriesChange }: CategoryManagerProps) => {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<UserCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const { scope } = useBudgetScope();

  // Form state
  const [editingCategory, setEditingCategory] = useState<UserCategory | null>(
    null,
  );
  const [name, setName] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [icon, setIcon] = useState("CircleDot");
  const [color, setColor] = useState("hsl(var(--primary))");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");

  const fetchCategories = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase.from("user_categories").select("*_id,name,type,icon,color,is_default,keywords");

      if (scope === "personal") {
        query = query.is("group_id", null).eq("user_id", user.id);
      } else {
        query = query.or(
          `group_id.eq.${scope},and(group_id.is.null,user_id.eq.${user.id})`,
        );
      }

      const { data, error } = await query.order("name");
      if (error) throw error;
      setCategories((data as UserCategory[]) || []);
    } catch (err) {
      console.error("Error fetching categories:", err);
      toast.error("Erro ao carregar categorias");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchCategories();
    }
  }, [open, user, scope]);

  const resetForm = () => {
    setEditingCategory(null);
    setName("");
    setType("expense");
    setIcon("CircleDot");
    setColor("hsl(var(--primary))");
    setKeywords([]);
    setKeywordInput("");
  };

  const handleEdit = (category: UserCategory) => {
    setEditingCategory(category);
    setName(category.name);
    setType(category.type as "income" | "expense");
    setIcon(category.icon);
    setColor(category.color);
    setKeywords(category.keywords || []);
  };

  const handleSave = async () => {
    if (!name.trim() || !user) return;

    setSaving(true);
    try {
      const categoryData = {
        user_id: user.id,
        group_id: scope === "personal" ? null : scope,
        name: name.trim(),
        type,
        icon,
        color,
        is_default: false,
        keywords: keywords.length > 0 ? keywords : null,
      };

      if (editingCategory) {
        const { error } = await supabase
          .from("user_categories")
          .update(categoryData)
          .eq("id", editingCategory.id);
        if (error) throw error;
        toast.success("Categoria atualizada!");
      } else {
        const { error } = await supabase
          .from("user_categories")
          .insert(categoryData);
        if (error) throw error;
        toast.success("Categoria criada!");
      }

      resetForm();
      fetchCategories();
      onCategoriesChange?.();
    } catch (err: any) {
      console.error("Error saving category:", err);
      if (err.code === "23505") {
        toast.error("Já existe uma categoria com esse nome");
      } else {
        toast.error("Erro ao salvar categoria");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (categoryId: string) => {
    try {
      const { error } = await supabase
        .from("user_categories")
        .delete()
        .eq("id", categoryId);
      if (error) throw error;
      toast.success("Categoria removida!");
      fetchCategories();
      onCategoriesChange?.();
    } catch (err) {
      console.error("Error deleting category:", err);
      toast.error("Erro ao remover categoria");
    }
  };

  const handleKeywordInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "," || e.key === "Enter") {
      e.preventDefault();
      const newKeyword = keywordInput.trim();
      if (newKeyword && !keywords.includes(newKeyword)) {
        setKeywords([...keywords, newKeyword]);
      }
      setKeywordInput("");
    }
  };

  const removeKeyword = (keywordToRemove: string) => {
    setKeywords(keywords.filter((keyword) => keyword !== keywordToRemove));
  };

  const IconComponent = (LucideIcons as any)[icon] || LucideIcons.CircleDot;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" />
          <span className="hidden sm:inline">Gerenciar Categorias</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Gerenciar Categorias</DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6 flex-1 overflow-hidden">
          {/* Form */}
          <div className="space-y-4 p-1 flex flex-col">
            <h3 className="text-lg font-medium">
              {editingCategory ? "Editar Categoria" : "Nova Categoria"}
            </h3>
            <div className="space-y-3">
                <Label htmlFor="cat-name">Nome</Label>
                <Input
                  id="cat-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Assinaturas"
                />
            </div>

            <div className="space-y-3">
              <Label>Palavras-chave para auto-categorização</Label>
              <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-background">
                {keywords.map((kw, index) => (
                  <Badge key={index} variant="secondary">
                    {kw}
                    <button
                      onClick={() => removeKeyword(kw)}
                      className="ml-1 rounded-full hover:bg-destructive/50"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <Input
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={handleKeywordInput}
                  placeholder="Adicionar palavra..."
                  className="flex-1 bg-transparent border-none focus:ring-0 h-auto p-0 m-0"
                />
              </div>
                <p className="text-xs text-muted-foreground">Pressione Enter ou vírgula para adicionar.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={type} onValueChange={(v) => setType(v as "income" | "expense")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Despesa</SelectItem>
                    <SelectItem value="income">Receita</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Ícone</Label>
                <Select value={icon} onValueChange={setIcon}>
                  <SelectTrigger>
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        <IconComponent className="h-4 w-4" />
                        <span className="text-xs">{icon}</span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <ScrollArea className="h-48">
                      <div className="grid grid-cols-6 gap-1 p-2">
                        {AVAILABLE_ICONS.map((iconName) => {
                          const Icon = (LucideIcons as any)[iconName] || LucideIcons.CircleDot;
                          return (
                            <button
                              key={iconName}
                              onClick={() => setIcon(iconName)}
                              className={`p-2 rounded hover:bg-muted ${icon === iconName ? "bg-primary/20" : ""}`}
                              title={iconName}
                            >
                              <Icon className="h-4 w-4" />
                            </button>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </SelectContent>
                </Select>
              </div>
            </div>

              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded-full border-2 ${color === c ? "border-foreground" : "border-transparent"}`}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSave}
                disabled={!name.trim() || saving}
                className="flex-1"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : editingCategory ? (
                  "Salvar Alterações"
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-1" /> Adicionar
                  </>
                )}
              </Button>
              {editingCategory && (
                <Button variant="ghost" onClick={resetForm}>
                  Cancelar
                </Button>
              )}
            </div>
          </div>

          {/* Categories List */}
          <div className="flex-1 min-h-0 border-l pl-6">
            <Label className="mb-2 block">Suas Categorias</Label>
            <ScrollArea className="h-full pr-4">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : categories.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  Nenhuma categoria personalizada
                </div>
              ) : (
                <div className="space-y-2">
                  {categories.map((cat) => {
                    const CatIcon = (LucideIcons as any)[cat.icon] || LucideIcons.CircleDot;
                    return (
                      <div
                        key={cat.id}
                        className="flex items-start justify-between p-2 rounded-lg hover:bg-muted/50 group"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1"
                            style={{ backgroundColor: cat.color }}
                          >
                            <CatIcon className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{cat.name}</p>
                            <Badge variant="outline" className="text-xs mb-1">
                              {cat.type === "income" ? "Receita" : "Despesa"}
                            </Badge>
                            <div className="flex flex-wrap gap-1 mt-1">
                                {(cat.keywords || []).map(kw => (
                                    <Badge key={kw} variant="secondary" className="text-[10px]">{kw}</Badge>
                                ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEdit(cat)}
                            disabled={cat.is_default}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDelete(cat.id)}
                            disabled={cat.is_default}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};