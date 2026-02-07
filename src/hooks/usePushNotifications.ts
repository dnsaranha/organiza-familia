import { useState, useEffect, useCallback } from 'react';
import { useToast } from './use-toast';
import { supabase } from '@/integrations/supabase/client';

// Base64 to Uint8Array conversion for VAPID keys
const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const usePushNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [vapidKey, setVapidKey] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch VAPID key from edge function
  const fetchVapidKey = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-vapid-key');
      if (error) throw error;
      if (data?.vapidPublicKey) {
        setVapidKey(data.vapidPublicKey);
        return data.vapidPublicKey;
      }
    } catch (err) {
      console.error('Error fetching VAPID key:', err);
    }
    return null;
  }, []);

  useEffect(() => {
    // Check if push notifications are supported
    const checkSupport = async () => {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        setIsSupported(true);
        await checkExistingSubscription();
      } else {
        console.log('Push notifications not supported');
        setIsSupported(false);
      }
    };

    checkSupport();
  }, []);

  const checkExistingSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();
      
      if (existingSubscription) {
        setSubscription(existingSubscription);
        setIsSubscribed(true);
        console.log('Found existing push subscription');
      }
    } catch (error) {
      console.error('Error checking existing subscription:', error);
    }
  };

  const subscribeToPush = async () => {
    if (!isSupported) {
      toast({
        title: 'Notificações não suportadas',
        description: 'Seu navegador não suporta notificações push.',
        variant: 'destructive',
      });
      return false;
    }

    setIsLoading(true);

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        toast({
          title: 'Permissão negada',
          description: 'É necessário permitir notificações para receber lembretes.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return false;
      }

      // Fetch VAPID key if not already loaded
      let currentVapidKey = vapidKey;
      if (!currentVapidKey) {
        currentVapidKey = await fetchVapidKey();
        if (!currentVapidKey) {
          throw new Error('Could not fetch VAPID key');
        }
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;
      
      // Subscribe to push service
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(currentVapidKey)
      });

      setSubscription(pushSubscription);
      setIsSubscribed(true);
      
      toast({
        title: '✅ Notificações ativadas!',
        description: 'Você receberá lembretes das suas tarefas agendadas.',
      });

      console.log('Push subscription successful:', pushSubscription);
      return true;

    } catch (error) {
      console.error('Error subscribing to push:', error);
      toast({
        title: 'Erro ao ativar notificações',
        description: 'Não foi possível ativar as notificações push.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribeFromPush = async () => {
    if (!subscription) return false;

    setIsLoading(true);

    try {
      // Unsubscribe from push service
      await subscription.unsubscribe();

      setSubscription(null);
      setIsSubscribed(false);
      
      toast({
        title: 'Notificações desativadas',
        description: 'Você não receberá mais notificações push.',
      });

      return true;

    } catch (error) {
      console.error('Error unsubscribing from push:', error);
      toast({
        title: 'Erro ao desativar notificações',
        description: 'Não foi possível desativar as notificações push.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const sendTestNotification = async () => {
    if (!isSubscribed) return;

    try {
      // Send a local test notification
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        registration.showNotification('🧪 Teste de Notificação', {
          body: 'Esta é uma notificação de teste do Organiza!',
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-96x96.png',
          tag: 'test-notification',
          requireInteraction: false,
        });
      }

      toast({
        title: 'Notificação enviada!',
        description: 'Você deve ver uma notificação em breve.',
      });

    } catch (error) {
      console.error('Error sending test notification:', error);
      toast({
        title: 'Erro ao enviar notificação',
        description: 'Não foi possível enviar a notificação de teste.',
        variant: 'destructive',
      });
    }
  };

  return {
    isSupported,
    isSubscribed,
    isLoading,
    subscribeToPush,
    unsubscribeFromPush,
    sendTestNotification,
  };
};