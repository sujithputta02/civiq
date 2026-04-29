import { useState, useEffect, useCallback } from 'react';
import { app, messaging, db, auth } from '@/lib/firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

interface NotificationState {
  token: string | null;
  isSupported: boolean;
  isPermissionGranted: boolean;
  isLoading: boolean;
  error: string | null;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const [state, setState] = useState<NotificationState>({
    token: null,
    isSupported: false,
    isPermissionGranted: false,
    isLoading: false,
    error: null,
  });

  // Check if notifications are supported
  useEffect(() => {
    const checkSupport = () => {
      const isSupported =
        typeof window !== 'undefined' &&
        'serviceWorker' in navigator &&
        'Notification' in window &&
        messaging !== null;

      setState((prev) => ({ ...prev, isSupported }));

      if (!isSupported) {
        console.info('ℹ️ Notifications not supported in this browser');
      }
    };

    checkSupport();
  }, []);

  // Check existing permission
  useEffect(() => {
    if (state.isSupported && typeof window !== 'undefined') {
      const permission = Notification.permission;
      setState((prev) => ({
        ...prev,
        isPermissionGranted: permission === 'granted',
      }));
    }
  }, [state.isSupported]);

  // Listen for foreground messages
  useEffect(() => {
    if (!messaging || !state.isPermissionGranted) return;

    try {
      const unsubscribe = onMessage(messaging, (payload) => {
        console.log('Foreground message received:', payload);
        toast.success(`${payload.notification?.title}: ${payload.notification?.body}`, {
          duration: 5000,
          position: 'top-right',
        });
      });
      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up message listener:', error);
    }
  }, [state.isPermissionGranted]);

  const requestPermission = useCallback(async () => {
    if (!state.isSupported || !messaging || !user) {
      console.warn('⚠️ Notifications not available or user not authenticated');
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();

      if (permission !== 'granted') {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: 'Notification permission denied',
          isPermissionGranted: false,
        }));
        console.info('ℹ️ Notification permission denied by user');
        return;
      }

      setState((prev) => ({ ...prev, isPermissionGranted: true }));

      // Validate VAPID key
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY;
      if (!vapidKey || vapidKey.length < 80) {
        const errorMsg =
          'Invalid or missing VAPID key. Please add NEXT_PUBLIC_VAPID_KEY to .env.local';
        console.warn(`⚠️ ${errorMsg}`);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMsg,
        }));
        return;
      }

      // Validate Firebase API key
      const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
      if (!apiKey || apiKey === 'placeholder') {
        const errorMsg = 'Firebase API Key is missing or invalid';
        console.error(`❌ ${errorMsg}`);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMsg,
        }));
        toast.error('Firebase configuration error');
        return;
      }

      // Register service worker
      console.log('📋 Registering service worker for messaging...');
      let registration: ServiceWorkerRegistration;
      try {
        registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        await navigator.serviceWorker.ready;
        console.log('✅ Service worker registered successfully');
      } catch (swError) {
        const errorMsg = 'Failed to register service worker';
        console.error(`❌ ${errorMsg}:`, swError);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMsg,
        }));
        return;
      }

      // Get FCM token
      console.log('🔑 Requesting FCM token...');
      let currentToken: string | null = null;

      try {
        currentToken = await getToken(messaging, {
          vapidKey: vapidKey,
          serviceWorkerRegistration: registration,
        });

        if (!currentToken) {
          throw new Error('No token returned from getToken');
        }

        console.log('✅ FCM token obtained successfully');
        setState((prev) => ({ ...prev, token: currentToken }));

        // Save token to Firestore
        try {
          await setDoc(
            doc(db, 'users', user.uid),
            {
              fcmToken: currentToken,
              notificationsEnabled: true,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
          console.log('✅ FCM token saved to Firestore');
          toast.success('Notifications enabled successfully');
        } catch (firestoreError) {
          console.error('⚠️ Failed to save FCM token to Firestore:', firestoreError);
          // Don't fail the whole process if Firestore save fails
        }
      } catch (fcmError: any) {
        const errorCode = fcmError?.code || fcmError?.message || '';
        const errorMsg = fcmError?.message || 'Unknown FCM error';

        // Handle specific FCM errors
        if (
          errorCode.includes('messaging/token-subscribe-failed') ||
          errorCode.includes('messaging/unsupported-browser') ||
          errorCode.includes('messaging/failed-service-worker-registration')
        ) {
          console.warn(
            `⚠️ FCM subscription failed: ${errorMsg}\n\nThis is likely due to:\n1. API Key restrictions (missing "Firebase Cloud Messaging API" permission)\n2. Browser/environment not supporting Web Push\n3. Service Worker registration issues\n\nNotifications are safely disabled. To enable:\n1. Go to Google Cloud Console > APIs & Services > Credentials\n2. Edit your API key > API restrictions\n3. Add "Firebase Cloud Messaging API"\n4. Restart the development server`
          );
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: 'FCM not available - API key may need configuration',
          }));
          return;
        }

        // Handle other FCM errors
        console.error(`❌ FCM Error (${errorCode}):`, errorMsg);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: `FCM Error: ${errorMsg}`,
        }));
      }

      setState((prev) => ({ ...prev, isLoading: false }));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error requesting notification permission:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMsg,
      }));
    }
  }, [state.isSupported, user]);

  return {
    token: state.token,
    isSupported: state.isSupported,
    isPermissionGranted: state.isPermissionGranted,
    isLoading: state.isLoading,
    error: state.error,
    requestPermission,
  };
};
