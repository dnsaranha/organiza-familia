import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/Header";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
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
} from "@/components/ui/alert-dialog";
import { Trash2, Loader2, Smartphone, Tags } from "lucide-react";
import { BottomNavConfig } from "@/components/BottomNavConfig";
import { CategoryManager } from "@/components/CategoryManager";

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [clearingData, setClearingData] = useState(false);
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [newAvatar, setNewAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [monthStartDay, setMonthStartDay] = useState<number | string>(1);
  const [carryOverBalance, setCarryOverBalance] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);

  const applyTheme = (mode: "light" | "dark") => {
    const root = document.documentElement;
    if (mode === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("organiza-theme", mode);
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setNewAvatar(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    };
    fetchUser();
  }, [navigate]);

  useEffect(() => {
    async function getProfileAndPreferences() {
      try {
        setLoading(true);
        if (!user) return;

        // Fetch profile
        const {
          data: profileData,
          error: profileError,
          status,
        } = await supabase
          .from("profiles")
          .select(`full_name, avatar_url`)
          .eq("id", user.id)
          .single();

        if (profileError && status !== 406) {
          throw profileError;
        }

        if (profileData) {
          setFullName(profileData.full_name || "");
          setAvatarUrl(profileData.avatar_url || "");
        }

        // Fetch preferences
        const { data: preferencesData, error: preferencesError } =
          await supabase
            .from("user_preferences")
            .select("month_start_day, carry_over_balance, theme")
            .eq("user_id", user.id)
            .maybeSingle();

        if (preferencesError && preferencesError.code !== "PGRST116") {
          throw preferencesError;
        }

        if (preferencesData) {
          setMonthStartDay(preferencesData.month_start_day || 1);
          setCarryOverBalance(preferencesData.carry_over_balance);
          const theme = preferencesData.theme || "system";
          const prefersDark =
            theme === "dark" ||
            (theme === "system" &&
              window.matchMedia &&
              window.matchMedia("(prefers-color-scheme: dark)").matches);
          setDarkMode(prefersDark);
          applyTheme(prefersDark ? "dark" : "light");
        }
      } catch (error) {
        toast({
          title: "Erro ao carregar perfil",
          description: (error as Error).message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      getProfileAndPreferences();
    }
  }, [user, toast]);

  async function clearUserData() {
    if (!user) return;

    try {
      setClearingData(true);

      // Delete all user data from various tables
      await supabase.from("transactions").delete().eq("user_id", user.id);
      await supabase.from("investment_transactions").delete().eq("user_id", user.id);
      await supabase.from("scheduled_tasks").delete().eq("user_id", user.id);
      await supabase.from("savings_goals").delete().eq("user_id", user.id);

      toast({
        title: "Dados limpos!",
        description: "Todos os seus dados financeiros foram removidos com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao limpar dados",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setClearingData(false);
    }
  }

  async function updateProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setLoading(true);
      if (!user) throw new Error("No user");

      let newAvatarUrl = avatarUrl;

      if (newAvatar) {
        const fileExt = newAvatar.name.split(".").pop();
        const filePath = `${user.id}/${Math.random()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, newAvatar);

        if (uploadError) {
          throw uploadError;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("avatars").getPublicUrl(filePath);

        newAvatarUrl = publicUrl;
      }

      const profileUpdates = {
        id: user.id,
        full_name: fullName,
        avatar_url: newAvatarUrl,
        updated_at: new Date().toISOString(),
      };

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(profileUpdates);
      if (profileError) throw profileError;

      const preferencesUpdates = {
        user_id: user.id,
        month_start_day: Number(monthStartDay),
        carry_over_balance: carryOverBalance,
        theme: darkMode ? "dark" : "light",
        updated_at: new Date().toISOString(),
      };

      const { error: preferencesError } = await supabase
        .from("user_preferences")
        .upsert(preferencesUpdates);
      if (preferencesError) throw preferencesError;

      applyTheme(darkMode ? "dark" : "light");

      toast({
        title: "Perfil atualizado!",
        description:
          "Seu perfil e suas preferências foram atualizados com sucesso.",
      });
      navigate("/");
    } catch (error) {
      toast({
        title: "Erro ao atualizar o perfil",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Header />
      <div className="flex justify-center items-center min-h-screen py-8">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Perfil de Usuário</CardTitle>
            <CardDescription>
              Atualize suas informações de perfil e preferências.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={updateProfile} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="text"
                    value={user?.email || ""}
                    disabled
                  />
                </div>
                <div>
                  <Label htmlFor="fullName">Nome Completo</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName || ""}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Avatar</Label>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20">
                      <AvatarImage
                        src={avatarPreview || avatarUrl}
                        alt={fullName || ""}
                      />
                      <AvatarFallback>
                        {fullName?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <Input
                      id="avatarFile"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="max-w-xs"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">
                  Preferências Financeiras
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="monthStartDay">Dia de Início do Mês</Label>
                  <Input
                    id="monthStartDay"
                    type="number"
                    min="1"
                    max="28"
                    value={monthStartDay}
                    onChange={(e) => setMonthStartDay(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Defina o dia em que seu mês financeiro começa (ex: 1 para o
                    dia primeiro).
                  </p>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <Label>Transportar Saldo Anterior</Label>
                    <p className="text-sm text-muted-foreground">
                      Iniciar o mês com o saldo final do mês anterior.
                    </p>
                  </div>
                  <Switch
                    checked={carryOverBalance}
                    onCheckedChange={setCarryOverBalance}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <Label>Modo escuro</Label>
                    <p className="text-sm text-muted-foreground">
                      Ative para usar o aplicativo com fundo escuro.
                    </p>
                  </div>
                  <Switch
                    checked={darkMode}
                    onCheckedChange={(checked) => {
                      setDarkMode(checked);
                      applyTheme(checked ? "dark" : "light");
                    }}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Tags className="h-5 w-5" />
                  <h3 className="text-lg font-medium">Gerenciar Categorias</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Crie e edite categorias personalizadas para suas transações e tarefas.
                </p>
                <CategoryManager />
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  <h3 className="text-lg font-medium">Menu Inferior (Mobile)</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Personalize quais atalhos aparecem no menu inferior do aplicativo mobile.
                </p>
                <BottomNavConfig />
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-destructive">
                  Zona de Perigo
                </h3>
                <div className="flex items-center justify-between rounded-lg border border-destructive/50 p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <Label>Limpar Dados</Label>
                    <p className="text-sm text-muted-foreground">
                      Remove todas as transações, investimentos, tarefas e metas.
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" disabled={clearingData}>
                        {clearingData ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 mr-2" />
                        )}
                        {clearingData ? "Limpando..." : "Limpar Dados"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. Isso irá excluir permanentemente 
                          todas as suas transações, investimentos, tarefas agendadas e metas de economia.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={clearUserData} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Sim, limpar tudo
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/")}
                >
                  Voltar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
