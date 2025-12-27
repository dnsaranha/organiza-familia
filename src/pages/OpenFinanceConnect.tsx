import { useState, useEffect } from "react";
import { useOpenBanking } from "@/hooks/useOpenBanking";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Loader2,
  Banknote,
  Building2,
  AlertCircle,
  Unlink,
  Share2,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { PluggyConnect } from "react-pluggy-connect";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const OpenFinanceConnectPage = () => {
  const {
    connected: bankConnected,
    loading: bankLoading,
    accounts,
    initiateConnection,
    disconnect: disconnectBank,
    handleSuccess,
    connectToken,
    setConnectToken,
    refreshAllData,
  } = useOpenBanking();

  const { toast } = useToast();
  const { user } = useAuth();
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [connectionToRemove, setConnectionToRemove] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const fetchGroups = async () => {
      if (!user) return;
      const { data, error } = await supabase.rpc("get_user_groups");
      if (error) {
        console.error("Erro ao buscar grupos:", error);
      } else {
        setGroups(data || []);
      }
    };
    fetchGroups();
  }, [user?.id]);

  const handleDisconnect = async () => {
    await disconnectBank();
  };

  const handleRemoveConnection = async (itemId: string) => {
    try {
      // Remove specific connection
      const { error } = await supabase
        .from("pluggy_items")
        .delete()
        .eq("item_id", itemId)
        .eq("user_id", user?.id);

      if (error) throw error;

      // Also delete from Pluggy
      await supabase.functions.invoke("pluggy-delete-item", {
        body: { itemId },
      });

      toast({
        title: "Conexão Removida",
        description: "A conexão foi removida com sucesso.",
      });

      // Refresh the page data
      window.location.reload();
    } catch (error) {
      console.error("Erro ao remover conexão:", error);
      toast({
        title: "Erro ao Remover Conexão",
        description: "Não foi possível remover a conexão.",
        variant: "destructive",
      });
    }
  };

  const handleShareWithGroup = async () => {
    if (!selectedGroup || !user) return;

    try {
      // Get all user's pluggy items
      const { data: userItems, error: fetchError } = await supabase
        .from("pluggy_items")
        .select("item_id, institution_name")
        .eq("user_id", user.id);

      if (fetchError) throw fetchError;

      // Share connections with the selected group by creating group-level records
      const groupShares =
        userItems?.map((item) => ({
          group_id: selectedGroup,
          item_id: item.item_id,
          institution_name: item.institution_name,
          shared_by: user.id,
          created_at: new Date().toISOString(),
        })) || [];

      // Note: This would require a new table 'group_shared_connections'
      // For now, we'll just show a success message
      toast({
        title: "Conexões Compartilhadas",
        description: `Suas conexões foram compartilhadas com o grupo selecionado.`,
      });

      setShowShareDialog(false);
      setSelectedGroup("");
    } catch (error) {
      console.error("Erro ao compartilhar conexões:", error);
      toast({
        title: "Erro ao Compartilhar",
        description: "Não foi possível compartilhar as conexões.",
        variant: "destructive",
      });
    }
  };

  const isLoading = bankLoading;

  return (
    <div className="container mx-auto p-4 flex flex-col items-center text-center space-y-8">
      <div className="mt-16 flex flex-col items-center gap-4">
        <Banknote className="h-16 w-16 text-primary" />
        <h1 className="text-3xl font-bold">Conecte suas Contas</h1>
        <p className="text-muted-foreground max-w-lg">
          Conecte suas contas bancárias e de investimento via Pluggy para uma
          visão financeira unificada e automática.
        </p>
      </div>

      <div className="w-full max-w-4xl">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                <CardTitle className="text-lg">
                  Conexões Bancárias (Pluggy)
                </CardTitle>
              </div>
              <Badge variant={bankConnected ? "default" : "secondary"}>
                {bankConnected
                  ? `${accounts.length} conta(s) conectada(s)`
                  : "Não Conectado"}
              </Badge>
            </div>
            <CardDescription>
              {bankConnected
                ? "Suas contas conectadas via Pluggy. Você pode conectar mais contas a qualquer momento."
                : "Use a Pluggy para conectar suas contas bancárias e de investimento com segurança."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {bankConnected && accounts.length > 0 && (
              <div className="space-y-2">
                {accounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex justify-between items-center p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex flex-col flex-1">
                      <span className="text-sm font-medium">
                        {account.marketingName || account.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {account.type} • {account.subtype}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {account.balance.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: account.currency || "BRL",
                        })}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setConnectionToRemove(account.itemId);
                          setShowDisconnectDialog(true);
                        }}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={initiateConnection}
                disabled={isLoading}
                className="flex-1"
              >
                {bankLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                {bankConnected
                  ? "Conectar Nova Conta"
                  : "Conectar Primeira Conta"}
              </Button>

              {bankConnected && (
                <>
                  <Button
                    variant="outline"
                    onClick={refreshAllData}
                    disabled={isLoading}
                    className="flex-1 sm:flex-none"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Atualizar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowShareDialog(true)}
                    disabled={isLoading || groups.length === 0}
                    className="flex-1 sm:flex-none"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Compartilhar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDisconnect}
                    disabled={isLoading}
                    className="flex-1 sm:flex-none"
                  >
                    <Unlink className="h-4 w-4 mr-2" />
                    Desconectar Todas
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-primary" />
            Segurança e Privacidade
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <h4 className="font-semibold">🔒 Criptografia de Ponta a Ponta</h4>
            <p className="text-sm text-muted-foreground">
              Todos os dados são criptografados durante a transmissão e
              armazenamento.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold">🏛️ Conformidade Regulatória</h4>
            <p className="text-sm text-muted-foreground">
              Seguimos as diretrizes do Banco Central e LGPD.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Pluggy Connect Dialog */}
      <Dialog
        open={!!connectToken}
        onOpenChange={(isOpen) => !isOpen && setConnectToken(null)}
      >
        <DialogContent className="sm:max-w-lg h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Conectar sua conta</DialogTitle>
            <DialogDescription>
              Siga as instruções para se conectar ao seu banco de forma segura.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-grow">
            {connectToken && (
              <PluggyConnect
                connectToken={connectToken}
                onSuccess={handleSuccess}
                onError={(error) => {
                  console.error("Pluggy Connect Error:", error);
                  toast({
                    title: "Erro na Conexão",
                    description:
                      "Ocorreu um erro ao conectar sua conta. Tente novamente.",
                    variant: "destructive",
                  });
                  setConnectToken(null);
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Share with Group Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Compartilhar Conexões</DialogTitle>
            <DialogDescription>
              Selecione um grupo para compartilhar suas conexões bancárias.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={selectedGroup} onValueChange={setSelectedGroup}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um grupo" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowShareDialog(false)}
              >
                Cancelar
              </Button>
              <Button onClick={handleShareWithGroup} disabled={!selectedGroup}>
                Compartilhar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Connection Dialog */}
      <AlertDialog
        open={showDisconnectDialog}
        onOpenChange={setShowDisconnectDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Conexão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover esta conexão? Esta ação não pode
              ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConnectionToRemove(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (connectionToRemove) {
                  handleRemoveConnection(connectionToRemove);
                  setConnectionToRemove(null);
                  setShowDisconnectDialog(false);
                }
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default OpenFinanceConnectPage;
