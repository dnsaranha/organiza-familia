
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
    if (!('serviceWorker' in navigator)) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Error checking push subscription:', error);
      setIsSubscribed(false);
    } finally {
      setIsSubscriptionLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  const subscribeToPush = async () => {
    if (!('serviceWorker' in navigator)) {
      toast({ title: 'Navegador não suportado', description: 'As notificações push não são suportadas neste navegador.', variant: 'destructive' });
      return;
    }

    setIsSubscriptionLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Check for existing subscription first
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        setIsSubscribed(true);
        setIsSubscriptionLoading(false);
        toast({ title: 'Você já está inscrito para receber notificações.' });
        return;
      }
      
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast({ title: 'Permissão negada', description: 'Você precisa permitir as notificações para se inscrever.', variant: 'destructive' });
        setIsSubscriptionLoading(false);
        return;
      }

      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error('VAPID public key não encontrada. Verifique a configuração das variáveis de ambiente.');
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const { error } = await supabase.functions.invoke('save-push-subscription', {
        body: subscription,
      });

      if (error) throw error;

      setIsSubscribed(true);
      toast({ title: 'Inscrição realizada com sucesso!', description: 'Você receberá notificações de tarefas importantes.' });

    } catch (error: any) {
      console.error('Error subscribing to push:', error);
      toast({
        title: 'Erro ao se inscrever',
        description: error.message || 'Não foi possível completar a inscrição para notificações.',
        variant: 'destructive',
      });
      setIsSubscribed(false);
    } finally {
      setIsSubscriptionLoading(false);
    }
  };

  const unsubscribeFromPush = async () => {
    setIsSubscriptionLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        setIsSubscribed(false);
        toast({ title: 'Você não está inscrito.' });
        return;
      }
      
      // Unsubscribe from browser
      const unsubscribed = await subscription.unsubscribe();
      if (!unsubscribed) {
        throw new Error('Falha ao cancelar a inscrição no navegador.');
      }

      // Delete subscription from backend
      const { error } = await supabase.functions.invoke('delete-push-subscription', {
        body: { endpoint: subscription.endpoint },
      });

      if (error) throw error;

      setIsSubscribed(false);
      toast({ title: 'Inscrição cancelada', description: 'Você não receberá mais notificações.' });

    } catch (error: any) {
      console.error('Error unsubscribing from push:', error);
      toast({
        title: 'Erro ao cancelar inscrição',
        description: error.message || 'Não foi possível remover a inscrição.',
        variant: 'destructive',
      });
    } finally {
      setIsSubscriptionLoading(false);
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
    subscribeToPush,
    unsubscribeFromPush,
  };
};
