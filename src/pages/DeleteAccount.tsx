import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, AlertTriangle, Trash2, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAccountDeletion } from "@/hooks/useAccountDeletion";
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

const DeleteAccount = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { processAccountDeletion } = useAccountDeletion();
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [deletionRequestId, setDeletionRequestId] = useState<string | null>(null);

  // Pre-fill email if user is logged in
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        setEmail(session.user.email);
        setIsLoggedIn(true);
        setUserId(session.user.id);
      }
    };
    checkAuth();
  }, []);

  const handleSubmitRequest = async () => {
    if (!email) {
      toast({
        title: "E-mail obrigatório",
        description: "Por favor, informe o e-mail associado à sua conta.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Insert deletion request into the database
      const { data: insertedData, error: insertError } = await supabase
        .from("account_deletion_requests")
        .insert({
          email: email.toLowerCase().trim(),
          reason: reason || null,
          status: "pending",
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("Error inserting request:", insertError);
      }

      const requestId = insertedData?.id;
      if (requestId) {
        setDeletionRequestId(requestId);

        // Process account deletion immediately via edge function
        try {
          await processAccountDeletion({
            deletion_request_id: requestId,
            email: email.toLowerCase().trim(),
            user_id: userId || undefined,
          });

          toast({
            title: "Conta excluída",
            description: "Sua conta e todos os dados foram permanentemente removidos.",
          });
        } catch (deletionError) {
          console.error("Error in automatic deletion process:", deletionError);
          // Even if the automatic deletion fails, the request was created
          toast({
            title: "Solicitação processada",
            description: "Sua solicitação foi registrada. Se o processamento automático falhar, nossa equipe processará manualmente.",
          });
        }
      }

      // If user is logged in, sign them out after submitting the request
      if (isLoggedIn) {
        await supabase.auth.signOut();
      }

      setRequestSubmitted(true);
    } catch (error) {
      console.error("Error submitting request:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao processar sua solicitação. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setShowConfirmDialog(false);
    }
  };

  if (requestSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 py-8 px-4">
        <div className="max-w-xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-xl font-semibold">Conta Excluída</h2>
                <p className="text-muted-foreground">
                  Sua conta e todos os dados foram permanentemente removidos do nosso sistema.
                </p>
                <div className="pt-4 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    <strong>Dados excluídos:</strong>
                  </p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside">
                    <li>Informações de perfil e conta</li>
                    <li>Transações e histórico financeiro</li>
                    <li>Metas e objetivos configurados</li>
                    <li>Conexões com instituições financeiras</li>
                    <li>Preferências e configurações</li>
                  </ul>
                </div>
                <Button
                  onClick={() => navigate("/")}
                  className="mt-4"
                >
                  Voltar para o início
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 py-8 px-4">
      <div className="max-w-xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold">
                  Excluir Conta e Dados
                </CardTitle>
                <CardDescription>
                  Solicite a exclusão permanente da sua conta
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Warning Alert */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    Atenção: Esta ação é irreversível
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Ao solicitar a exclusão da sua conta, todos os seus dados serão
                    permanentemente removidos dos nossos servidores, incluindo:
                  </p>
                  <ul className="text-sm text-amber-700 dark:text-amber-300 list-disc list-inside space-y-1">
                    <li>Informações de perfil e autenticação</li>
                    <li>Todas as transações financeiras registradas</li>
                    <li>Metas, orçamentos e configurações</li>
                    <li>Histórico de investimentos</li>
                    <li>Conexões com Open Finance</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail da conta *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoggedIn}
                  className={isLoggedIn ? "bg-muted" : ""}
                />
                <p className="text-xs text-muted-foreground">
                  {isLoggedIn 
                    ? "E-mail detectado automaticamente da sua conta logada"
                    : "Informe o e-mail associado à sua conta no aplicativo"
                  }
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Motivo da exclusão (opcional)</Label>
                <Textarea
                  id="reason"
                  placeholder="Nos ajude a melhorar: conte por que está saindo..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            {/* Process Info */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-3">
              <h3 className="font-medium">Como funciona o processo:</h3>
              <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-2">
                <li>Envie sua solicitação através deste formulário</li>
                <li>Sua conta será excluída imediatamente</li>
                <li>Todos os seus dados serão permanentemente removidos</li>
                <li>Você receberá confirmação por e-mail</li>
              </ol>
            </div>

            {/* Submit Button */}
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => setShowConfirmDialog(true)}
              disabled={!email || isSubmitting}
            >
              {isSubmitting ? "Processando..." : "Excluir Minha Conta Permanentemente"}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Dúvidas? Entre em contato conosco em{" "}
              <a
                href="mailto:suporte@organizagrana.com"
                className="text-primary hover:underline"
              >
                suporte@organizagrana.com
              </a>
            </p>
          </CardContent>
        </Card>

        {/* Confirmation Dialog */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão permanente</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja PERMANENTEMENTE excluir sua conta e todos os dados?
                Esta ação é irreversível e não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleSubmitRequest}
                className="bg-red-600 hover:bg-red-700"
              >
                Sim, excluir permanentemente
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default DeleteAccount;
