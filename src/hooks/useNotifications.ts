import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export const useNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const { toast } = useToast();

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    }
    return 'denied';
  };

  const sendNotification = async (title: string, options?: NotificationOptions) => {
    if ('Notification' in window && permission === 'granted') {
      try {
        // Try using Service Worker for notifications (required in some contexts)
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          const registration = await navigator.serviceWorker.ready;
          await registration.showNotification(title, {
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            ...options,
          });
        } else {
          // Fallback to regular Notification API
          new Notification(title, {
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            ...options,
          });
        }
      } catch (error) {
        // Fallback para toast se as notificações falharem
        toast({
          title,
          description: options?.body,
        });
      }
    } else {
      // Fallback para toast se as notificações não estiverem disponíveis
      toast({
        title,
        description: options?.body,
      });
    }
  };

  const scheduleNotification = (
    title: string,
    options: NotificationOptions & { scheduleTime: Date }
  ) => {
    const { scheduleTime, ...notificationOptions } = options;
    const now = new Date();
    const delay = scheduleTime.getTime() - now.getTime();

    if (delay > 0) {
      setTimeout(() => {
        sendNotification(title, notificationOptions);
      }, delay);
      
      return true;
    }
    
    return false;
  };

  return {
    permission,
    requestPermission,
    sendNotification,
    scheduleNotification,
    isSupported: 'Notification' in window,
  };
};