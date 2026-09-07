import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Loader2, Bell, BellRing, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';

export const PWANotificationSettings = () => {
  const { 
    isSubscribed,
    isSubscriptionLoading,
    permissionState,
    subscribeToPush,
    unsubscribeFromPush,
    sendTestNotification,
  } = usePWA();

  const isBlocked = permissionState === 'denied';

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BellRing className="h-5 w-5 text-primary" />
            Notificações Push e Lembretes
          </CardTitle>
          <Badge variant={isBlocked ? "destructive" : isSubscribed ? "default" : "secondary"}>
            {isBlocked ? "Bloqueado no Navegador" : isSubscribed ? "Ativo" : "Desativado"}
          </Badge>
        </div>
        <CardDescription>
          Receba alertas importantes de contas e vencimentos de tarefas diretamente no seu dispositivo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
          <div className="space-y-1">
            <Label htmlFor="push-notifications" className="text-base font-medium">
              Ativar Notificações no Dispositivo
            </Label>
            <p className="text-xs text-muted-foreground">
              {isBlocked
                ? "As notificações foram bloqueadas no navegador. Clique no ícone de cadeado 🔒 ao lado da URL para liberar."
                : isSubscribed
                ? "Notificações e lembretes de tarefas ativados com sucesso neste aparelho."
                : "Habilite para ser avisado sobre suas tarefas e contas a pagar."}
            </p>
          </div>
          <Switch
            id="push-notifications"
            checked={isSubscribed}
            onCheckedChange={(checked) => {
              setTimeout(() => {
                if (checked) {
                  subscribeToPush();
                } else {
                  unsubscribeFromPush();
                }
              }, 0);
            }}
            disabled={isSubscriptionLoading || isBlocked}
          />
        </div>

        {isSubscriptionLoading && (
          <div className="flex items-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />
            Processando permissões...
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between p-3 rounded-lg bg-muted/40 border border-dashed">
          <div className="space-y-0.5">
            <p className="text-sm font-medium flex items-center gap-1.5">
              <Bell className="h-4 w-4 text-primary" />
              Testar Notificação Imediata
            </p>
            <p className="text-xs text-muted-foreground">
              Dispare um teste para confirmar se o seu aparelho está exibindo os alertas corretamente.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={sendTestNotification}
            disabled={isSubscriptionLoading}
            className="whitespace-nowrap"
          >
            <Bell className="h-3.5 w-3.5 mr-1.5" />
            Enviar Notificação de Teste
          </Button>
        </div>

        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5" />
            Como garantir que os Push funcionem 100%:
          </h4>
          <ul className="text-xs text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                <strong>1. No Navegador:</strong> Quando solicitado, clique em <strong>"Permitir"</strong>. Se tiver negado anteriormente, clique no ícone de <strong>cadeado 🔒</strong> na barra de endereços e altere Notificações para "Permitir".
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                <strong>2. No Celular (Android / iOS):</strong> Instale o app na tela inicial (PWA). No Android pelo Chrome toque nos três pontinhos e em <em>"Adicionar à tela inicial"</em>. No iPhone pelo Safari toque em <em>"Compartilhar"</em> e <em>"Adicionar à Tela de Início"</em>.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                <strong>3. Nas Tarefas e Contas:</strong> Ao agendar uma conta ou compromisso na página <em>Tarefas</em>, marque a opção <strong>"Notificação Push"</strong> para ser alertado antes do vencimento.
              </span>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
