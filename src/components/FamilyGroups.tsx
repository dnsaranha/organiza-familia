import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
} from "@/components/ui/alert-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Users,
  Plus,
  Copy,
  UserPlus,
  Crown,
  Trash2,
  Loader2,
  Pencil,
  AlertTriangle,
  MoreVertical,
  UserCog,
  UserX,
  LogOut,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ErrorBoundary from "./ErrorBoundary";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FamilyGroup {
  id: string;
  name: string;
  owner_id: string;
  join_code: string;
  created_at: string;
  is_owner?: boolean;
  member_count?: number;
}

interface Member {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
}

export const FamilyGroups = () => {
  const [groups, setGroups] = useState<FamilyGroup[]>([]);
  const [members, setMembers] = useState<Record<string, Member[]>>({});
  const [loadingMembers, setLoadingMembers] = useState<Record<string, boolean>>(
    {},
  );
  const [newGroupName, setNewGroupName] = useState("");
  const [editingGroup, setEditingGroup] = useState<FamilyGroup | null>(null);
  const [editGroupName, setEditGroupName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState<FamilyGroup | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadGroups();
    }
  }, [user, refreshKey]);

  const loadGroups = async () => {
    if (!user) return;
    setLoadingGroups(true);

    try {
      const { data: groupsData, error } = await (supabase as any).rpc(
        "get_user_groups",
      );

      if (error) throw error;

      const groupsWithCounts = await Promise.all(
        ((groupsData as FamilyGroup[]) || []).map(async (group) => {
          const { count } = await supabase
            .from("group_members")
            .select("*", { count: "exact", head: true })
            .eq("group_id", group.id);
          return {
            ...group,
            is_owner: group.owner_id === user.id,
            member_count: count || 0,
          };
        }),
      );

      setGroups(groupsWithCounts);
    } catch (error) {
      // Silently fail - network errors are expected in some environments
      setGroups([]);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os grupos.",
        variant: "destructive",
      });
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleEditClick = (group: FamilyGroup) => {
    setEditingGroup(group);
    setEditGroupName(group.name);
    setEditDialogOpen(true);
  };

  const handleUpdateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup || !editGroupName.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("family_groups")
        .update({ name: editGroupName.trim() })
        .eq("id", editingGroup.id);
      if (error) throw error;
      toast({
        title: "Grupo atualizado!",
        description: `O nome do grupo foi alterado para "${editGroupName}".`,
      });
      setEditDialogOpen(false);
      setEditingGroup(null);
      setRefreshKey((k) => k + 1);
    } catch (error) {
      console.error("Erro ao atualizar grupo:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o grupo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!deletingGroup) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("family_groups")
        .delete()
        .eq("id", deletingGroup.id);
      if (error) throw error;
      toast({
        title: "Grupo excluído!",
        description: `O grupo "${deletingGroup.name}" foi excluído com sucesso.`,
      });
      setDeleteDialogOpen(false);
      setDeletingGroup(null);
      setRefreshKey((k) => k + 1);
    } catch (error) {
      console.error("Erro ao excluir grupo:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o grupo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleGroupMembers = async (groupId: string) => {
    if (members[groupId]) {
      return; // Already loaded
    }
    setLoadingMembers((prev) => ({ ...prev, [groupId]: true }));
    try {
      const { data, error } = await (supabase as any).rpc("get_group_members", {
        p_group_id: groupId,
      });
      if (error) throw error;
      setMembers((prev) => ({ ...prev, [groupId]: (data as Member[]) || [] }));
    } catch (error) {
      console.error(`Erro ao carregar membros do grupo ${groupId}:`, error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os membros do grupo.",
        variant: "destructive",
      });
    } finally {
      setLoadingMembers((prev) => ({ ...prev, [groupId]: false }));
    }
  };

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newGroupName.trim()) return;

    setLoading(true);
    try {
      const { data: group, error: groupError } = await supabase
        .from("family_groups")
        .insert({
          name: newGroupName.trim(),
          owner_id: user.id,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      const { error: memberError } = await supabase
        .from("group_members")
        .insert({
          group_id: group.id,
          user_id: user.id,
          role: "owner",
        });

      if (memberError) throw memberError;

      toast({
        title: "Grupo criado!",
        description: `Grupo "${newGroupName}" foi criado com sucesso.`,
      });

      setNewGroupName("");
      setCreateDialogOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (error: any) {
      console.error("Erro ao criar grupo:", error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o grupo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const joinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("join_group", {
        _join_code: joinCode.trim(),
      });

      if (error) throw error;

      toast({
        title: "Entrou no grupo!",
        description: "Você entrou no grupo com sucesso.",
      });

      setJoinCode("");
      setJoinDialogOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (error: any) {
      console.error("Erro ao entrar no grupo:", error);
      toast({
        title: "Erro",
        description:
          error.message === "invalid join code"
            ? "Código de convite inválido"
            : "Não foi possível entrar no grupo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyJoinCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast({
        title: "Código copiado!",
        description:
          "O código de convite foi copiado para a área de transferência.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível copiar o código.",
        variant: "destructive",
      });
    }
  };

  const removeMember = async (groupId: string, memberId: string) => {
    if (!user) return;

    setLoading(true);
    try {
      // Delete group member directly
      const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", memberId);

      if (error) throw error;

      toast({
        title: "Membro removido",
        description: "O membro foi removido do grupo.",
      });

      const { data, error: fetchError } = await (supabase as any).rpc(
        "get_group_members",
        { p_group_id: groupId },
      );
      if (fetchError) throw fetchError;
      setMembers((prev) => ({ ...prev, [groupId]: (data as Member[]) || [] }));
      setRefreshKey((k) => k + 1);
    } catch (error: any) {
      console.error("Erro ao remover membro:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível remover o membro.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateMemberRole = async (
    groupId: string,
    memberId: string,
    newRole: "editor" | "member",
  ) => {
    if (!user) return;

    setLoading(true);
    try {
      // Update member role directly
      const { error } = await supabase
        .from("group_members")
        .update({ role: newRole })
        .eq("group_id", groupId)
        .eq("user_id", memberId);

      if (error) throw error;

      toast({
        title: "Função do membro atualizada",
        description: `O membro agora é um ${newRole}.`,
      });

      const { data, error: fetchError } = await (supabase as any).rpc(
        "get_group_members",
        { p_group_id: groupId },
      );
      if (fetchError) throw fetchError;
      setMembers((prev) => ({ ...prev, [groupId]: (data as Member[]) || [] }));
    } catch (error: any) {
      console.error("Erro ao atualizar função do membro:", error);
      toast({
        title: "Erro",
        description:
          error.message || "Não foi possível atualizar a função do membro.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const leaveGroup = async (groupId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Saiu do grupo",
        description: "Você saiu do grupo.",
      });

      setRefreshKey((k) => k + 1);
    } catch (error) {
      console.error("Erro ao sair do grupo:", error);
      toast({
        title: "Erro",
        description: "Não foi possível sair do grupo.",
        variant: "destructive",
      });
    }
  };

  if (!user) return null;

  const fallbackUI = (
    <Card>
      <CardHeader>
        <CardTitle>Erro</CardTitle>
      </CardHeader>
      <CardContent>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro ao carregar os grupos</AlertTitle>
          <AlertDescription>
            Não foi possível carregar os grupos. Tente novamente mais tarde.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );

  return (
    <ErrorBoundary fallback={fallbackUI}>
      <Card className="bg-gradient-card shadow-card border">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Grupos
            </div>
            <div className="flex gap-2">
              <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" disabled={loadingGroups}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Entrar
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Entrar em um Grupo</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={joinGroup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="join-code">Código de Convite</Label>
                      <Input
                        id="join-code"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value)}
                        placeholder="Digite o código de 8 caracteres"
                        maxLength={8}
                        required
                      />
                    </div>
                    <Button type="submit" disabled={loading} className="w-full">
                      {loading ? "Entrando..." : "Entrar no Grupo"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
              <Dialog
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    className="bg-gradient-primary text-primary-foreground shadow-button hover:scale-105 transition-smooth"
                    disabled={loadingGroups}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Criar
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar Novo Grupo</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={createGroup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="create-group-name">Nome do Grupo</Label>
                      <Input
                        id="create-group-name"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder="Ex: Família Silva"
                        required
                      />
                    </div>
                    <Button type="submit" disabled={loading} className="w-full">
                      {loading ? "Criando..." : "Criar Grupo"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingGroups ? (
            <div className="text-center py-8 text-muted-foreground">
              <Loader2 className="h-8 w-8 mx-auto animate-spin mb-3 opacity-50" />
              <p>Carregando grupos...</p>
            </div>
          ) : groups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum grupo ainda.</p>
              <p className="text-sm">Crie um grupo ou entre em um existente!</p>
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full space-y-4">
              {groups.map((group) => (
                <AccordionItem
                  key={group.id}
                  value={group.id}
                  className="bg-muted/50 border-0 rounded-lg overflow-hidden"
                >
                  <AccordionTrigger
                    className="p-4 hover:no-underline"
                    onClick={() => toggleGroupMembers(group.id)}
                  >
                    <div className="flex items-start justify-between w-full">
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{group.name}</h4>
                          {group.is_owner && (
                            <Badge variant="secondary" className="text-xs">
                              <Crown className="h-3 w-3 mr-1" />
                              Proprietário
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>
                            {group.member_count}{" "}
                            {group.member_count === 1 ? "membro" : "membros"}
                          </span>
                          {group.is_owner && (
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs bg-background px-2 py-1 rounded">
                                {group.join_code}
                              </span>
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyJoinCode(group.join_code);
                                }}
                                className="h-6 px-2 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground cursor-pointer"
                              >
                                <Copy className="h-3 w-3" />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center">
                        {group.is_owner && (
                          <>
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditClick(group);
                              }}
                              className="h-8 w-8 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground text-muted-foreground hover:text-primary cursor-pointer"
                            >
                              <Pencil className="h-4 w-4" />
                            </div>
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingGroup(group);
                                setDeleteDialogOpen(true);
                              }}
                              className="h-8 w-8 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground text-muted-foreground hover:text-destructive cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </div>
                          </>
                        )}
                        {!group.is_owner && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    leaveGroup(group.id);
                                  }}
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10 ml-auto"
                                >
                                  <LogOut className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Sair do Grupo</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="px-4 pb-4 border-t border-muted">
                      <h4 className="font-semibold my-3 text-sm text-muted-foreground">
                        Membros
                      </h4>
                      {loadingMembers[group.id] ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Carregando...</span>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {(members[group.id] || []).map((member) => (
                            <div
                              key={member.id}
                              className="flex items-center justify-between gap-3"
                            >
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage
                                    src={member.avatar_url || undefined}
                                    alt={member.full_name || "Avatar"}
                                  />
                                  <AvatarFallback>
                                    {(member.full_name || "U")
                                      .charAt(0)
                                      .toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <span className="text-sm font-medium">
                                    {member.full_name || "Usuário Sem Nome"}
                                  </span>
                                  <Badge
                                    variant={
                                      member.role === "owner"
                                        ? "default"
                                        : "secondary"
                                    }
                                    className="ml-2 text-xs capitalize"
                                  >
                                    {member.role}
                                  </Badge>
                                </div>
                              </div>

                              {group.is_owner && user?.id !== member.id && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 flex-shrink-0"
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {member.role === "member" && (
                                      <DropdownMenuItem
                                        onClick={() =>
                                          updateMemberRole(
                                            group.id,
                                            member.id,
                                            "editor",
                                          )
                                        }
                                      >
                                        <UserCog className="mr-2 h-4 w-4" />
                                        <span>Tornar Editor</span>
                                      </DropdownMenuItem>
                                    )}
                                    {member.role === "editor" && (
                                      <DropdownMenuItem
                                        onClick={() =>
                                          updateMemberRole(
                                            group.id,
                                            member.id,
                                            "member",
                                          )
                                        }
                                      >
                                        <UserCog className="mr-2 h-4 w-4" />
                                        <span>Tornar Membro</span>
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem
                                      className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                      onClick={() =>
                                        removeMember(group.id, member.id)
                                      }
                                    >
                                      <UserX className="mr-2 h-4 w-4" />
                                      <span>Remover do grupo</span>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Nome do Grupo</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateGroup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-group-name">Novo Nome do Grupo</Label>
              <Input
                id="edit-group-name"
                value={editGroupName}
                onChange={(e) => setEditGroupName(e.target.value)}
                placeholder="Ex: Família Silva"
                required
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o
              grupo "{deletingGroup?.name}" e todas as suas informações
              associadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGroup} disabled={loading}>
              {loading ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ErrorBoundary>
  );
};
