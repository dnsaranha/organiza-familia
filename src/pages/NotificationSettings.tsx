
import { PWANotificationSettings } from '@/components/PWANotificationSettings';

const NotificationSettingsPage = () => {
  return (
    <div className="container mx-auto p-4 space-y-8">
       <div>
        <h1 className="text-3xl font-bold">Configurar Notificações</h1>
        <p className="text-muted-foreground">Ative e gerencie as notificações push para se manter atualizado.</p>
      </div>
      <PWANotificationSettings />
    </div>
  );
};

export default NotificationSettingsPage;
