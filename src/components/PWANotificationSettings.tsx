'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Smartphone, Loader2 } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';

export const PWANotificationSettings = () => {
  const { 
    isSubscribed,
    isSubscriptionLoading,
    subscribeToPush,
    unsubscribeFromPush,
  } = usePWA();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Notificações Push
        </CardTitle>
        <CardDescription>
          Receba alertas importantes mesmo quando o aplicativo estiver fechado.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="push-notifications">Ativar Notificações Push</Label>
            <p className="text-sm text-muted-foreground">
              Status: {isSubscribed ? 'Inscrito' : 'Não Inscrito'}
            </p>
          </div>
          <Switch
            id="push-notifications"
            checked={isSubscribed}
            onCheckedChange={(checked) => {
              // Defer state update to prevent flushSync warning
              setTimeout(() => {
                if (checked) {
                  subscribeToPush();
                } else {
                  unsubscribeFromPush();
                }
              }, 0);
            }}
            disabled={isSubscriptionLoading}
          />
        </div>
        
        {isSubscriptionLoading && (
          <div className="flex items-center text-sm text-muted-foreground mt-4">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processando...
          </div>
        )}
      </CardContent>
    </Card>
  );
};
