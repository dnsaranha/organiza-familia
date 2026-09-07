
import { useState, useEffect, useCallback } from 'react';
import { useToast } from './use-toast';
import { supabase } from '@/integrations/supabase/client';

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const usePWA = () => {
  const { toast } = useToast();
  // PWA Installation state
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  // Push Notification state
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubscriptionLoading, setIsSubscriptionLoading] = useState(true);
  const [permissionState, setPermissionState] = useState<NotificationPermission | 'unsupported'>('default');

  // --- Start of PWA Installation Logic ---
  useEffect(() => {
    const checkIfInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true || document.referrer.includes('android-app://')) {
        setIsInstalled(true);
      }
    };
    checkIfInstalled();

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      toast({
        title: '✅ App instalado!',
        description: 'O Organiza foi instalado com sucesso no seu dispositivo.',
      });
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [toast]);

  const installApp = async () => {
    if (!deferredPrompt) {
      toast({ title: 'Instalação não disponível', variant: 'destructive' });
      return false;
    }
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      toast({ title: '🎉 Instalando app...', description: 'O Organiza está sendo instalado.' });
    }
    setDeferredPrompt(null);
    setIsInstallable(false);
    return outcome === 'accepted';
  };
  // --- End of PWA Installation Logic ---


  // --- Start of Push Notification Logic ---
  const checkSubscription = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermissionState('unsupported');
      setIsSubscriptionLoading(false);
      return;
    }

    setPermissionState(Notification.permission);
    if (Notification.permission === 'granted') {
      setIsSubscribed(true);
    }

    if (!('serviceWorker' in navigator)) {
      setIsSubscriptionLoading(false);
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager?.getSubscription();
      if (subscription) {
        setIsSubscribed(true);
      }
    } catch (error) {
      console.error('Error checking push subscription:', error);
    } finally {
      setIsSubscriptionLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  const subscribeToPush = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast({
        title: 'Navegador não suportado',
        description: 'As notificações não são suportadas neste navegador.',
        variant: 'destructive',
      });
      return false;
    }

    setIsSubscriptionLoading(true);
    try {
      // 1. Solicita permissão explícita no navegador
      const permission = await Notification.requestPermission();
      setPermissionState(permission);

      if (permission !== 'granted') {
        toast({
          title: 'Permissão não concedida',
          description: 'Para receber alertas, libere as notificações no ícone de cadeado 🔒 ao lado do endereço web.',
          variant: 'destructive',
        });
        setIsSubscribed(false);
        return false;
      }

      // 2. Tenta registrar Web Push no Service Worker com VAPID (se configurado)
      let vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        try {
          const { data } = await supabase.functions.invoke('get-vapid-key');
          if (data?.vapidPublicKey) {
            vapidPublicKey = data.vapidPublicKey;
          }
        } catch {
          // VAPID não configurado no backend, continua com notificações ativas no dispositivo
        }
      }

      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          if (vapidPublicKey && registration.pushManager) {
            const subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
            });

            await supabase.functions.invoke('save-push-subscription', {
              body: subscription,
            }).catch(() => null);
          }
        } catch (swErr) {
          console.warn('Aviso ao registrar Push Manager:', swErr);
        }
      }

      setIsSubscribed(true);
      toast({
        title: '✅ Notificações ativadas!',
        description: 'Você receberá lembretes de tarefas e alertas financeiros diretamente neste dispositivo.',
      });

      return true;
    } catch (error: any) {
      console.error('Error subscribing to push:', error);
      toast({
        title: 'Erro ao ativar notificações',
        description: error.message || 'Não foi possível ativar as notificações.',
        variant: 'destructive',
      });
      setIsSubscribed(false);
      return false;
    } finally {
      setIsSubscriptionLoading(false);
    }
  };

  const unsubscribeFromPush = async () => {
    setIsSubscriptionLoading(true);
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager?.getSubscription();

        if (subscription) {
          await subscription.unsubscribe();
          supabase.functions.invoke('delete-push-subscription', {
            body: { endpoint: subscription.endpoint },
          }).catch(() => null);
        }
      }

      setIsSubscribed(false);
      toast({
        title: 'Notificações desativadas',
        description: 'Você não receberá mais notificações neste dispositivo.',
      });
      return true;
    } catch (error: any) {
      console.error('Error unsubscribing from push:', error);
      toast({
        title: 'Erro ao desativar',
        description: error.message || 'Não foi possível desativar as notificações.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsSubscriptionLoading(false);
    }
  };

  const sendTestNotification = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast({
        title: 'Não suportado',
        description: 'Notificações não são suportadas neste navegador.',
        variant: 'destructive',
      });
      return;
    }

    if (Notification.permission !== 'granted') {
      const granted = await subscribeToPush();
      if (!granted) return;
    }

    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification('🔔 Organiza: Notificação Ativa!', {
          body: 'Seus lembretes de contas e tarefas financeiras estão funcionando com sucesso!',
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-96x96.png',
          tag: 'test-notification-' + Date.now(),
        });
      } else {
        new Notification('🔔 Organiza: Notificação Ativa!', {
          body: 'Seus lembretes de contas e tarefas financeiras estão funcionando com sucesso!',
          icon: '/icons/icon-192x192.png',
        });
      }

      toast({
        title: '🔔 Notificação enviada!',
        description: 'Confira a notificação na tela ou na barra de avisos do seu sistema.',
      });
    } catch (err: any) {
      console.error('Erro ao enviar notificação de teste:', err);
      toast({
        title: 'Erro no envio',
        description: err.message || 'Não foi possível disparar a notificação de teste.',
        variant: 'destructive',
      });
    }
  };
  // --- End of Push Notification Logic ---

  return {
    // Install
    isInstallable,
    isInstalled,
    installApp,
    // Push
    isSubscribed,
    isSubscriptionLoading,
    permissionState,
    subscribeToPush,
    unsubscribeFromPush,
    sendTestNotification,
  };
};
