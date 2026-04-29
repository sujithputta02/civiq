'use client';

import { useServiceWorker } from '@/hooks/useServiceWorker';

/**
 * Client component to register service worker
 * Separated from layout to ensure it only runs on client
 */
export function ServiceWorkerClient() {
  useServiceWorker();
  return null;
}
