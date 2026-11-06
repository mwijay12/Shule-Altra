/**
 * @fileOverview Minimal `firebase/app` replacement for the offline demo.
 */

type DemoApp = {
  name: string;
  options: Record<string, any>;
  automaticDataCollectionEnabled: boolean;
  __demo: true;
};

const apps = new Map<string, DemoApp>();

function createApp(name: string, options: Record<string, any>): DemoApp {
  return {
    name,
    options: { ...options, projectId: options?.projectId || 'shule-altra-demo' },
    automaticDataCollectionEnabled: false,
    __demo: true,
  };
}

export function initializeApp(options?: Record<string, any>, name = '[DEFAULT]'): any {
  if (apps.has(name)) return apps.get(name);
  const appInstance = createApp(name, options || {});
  apps.set(name, appInstance);
  return appInstance;
}

export function getApps(): any[] {
  return Array.from(apps.values());
}

export function getApp(name = '[DEFAULT]'): any {
  const existing = apps.get(name);
  if (existing) return existing;
  return initializeApp({}, name);
}

export async function deleteApp(appInstance: any): Promise<void> {
  apps.delete(appInstance?.name || '[DEFAULT]');
}

export const FirebaseApp: any = undefined;
export const FirebaseOptions: any = undefined;
