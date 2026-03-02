/// <reference types="vite/client" />

// Augment ServiceWorkerRegistration with Push API
interface ServiceWorkerRegistration {
  readonly pushManager: PushManager;
}

interface PushManager {
  getSubscription(): Promise<PushSubscription | null>;
  subscribe(options?: PushSubscriptionOptionsInit): Promise<PushSubscription>;
  permissionState(options?: PushSubscriptionOptionsInit): Promise<PushPermissionState>;
}

type PushPermissionState = 'denied' | 'granted' | 'prompt';

interface PushSubscriptionOptionsInit {
  applicationServerKey?: BufferSource | string | null;
  userVisibleOnly?: boolean;
}
