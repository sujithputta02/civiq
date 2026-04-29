import { useState, useEffect } from 'react';
import { app, messaging, db, auth } from '@/lib/firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

export const useNotifications = () => {
  const { user } = useAuth();
  const [token, setToken] = useState<string | null>(null);

  const requestPermission = async () => {
    if (!messaging || !user) return;

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        // Get the token
        // IMPORTANT: Replace 'YOUR_VAPID_KEY' with the key from your Firebase Console
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY;
        
        if (!vapidKey || vapidKey.length < 80) {
          console.warn('⚠️ Invalid or missing VAPID key in .env.local. Notifications will be disabled. Please copy the 87-character Web Push Certificate from Firebase Console > Project Settings > Cloud Messaging.');
          return;
        }

        // Check if the Firebase app has an API key at runtime
        const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
        if (!apiKey || apiKey === 'placeholder') {
          console.error('Firebase API Key is missing or invalid in the browser environment. Ensure NEXT_PUBLIC_FIREBASE_API_KEY is set and restart the server.');
          toast.error('Firebase configuration error.');
          return;
        }

        console.log('Registering service worker for messaging...');
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        await navigator.serviceWorker.ready;
        console.log('Service worker registered successfully!');
        console.log('Firebase App Options:', app.options);

        let currentToken = null;
        try {
          currentToken = await getToken(messaging, {
            vapidKey: vapidKey,
            serviceWorkerRegistration: registration
          });
        } catch (fcmError: any) {
          if (fcmError.message && fcmError.message.includes('messaging/token-subscribe-failed') || fcmError.code === 'messaging/token-subscribe-failed') {
            console.warn('⚠️ FCM subscription failed (likely API Key restrictions). Notifications safely disabled until key is unrestricted.');
            return;
          }
          throw fcmError;
        }

        if (currentToken) {
          setToken(currentToken);
          // Save token to user's document
          await setDoc(doc(db, 'users', user.uid), {
            fcmToken: currentToken,
            notificationsEnabled: true,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  };

  useEffect(() => {
    if (messaging) {
      const unsubscribe = onMessage(messaging, (payload) => {
        console.log('Foreground message received:', payload);
        toast.success(`${payload.notification?.title}: ${payload.notification?.body}`, {
          duration: 5000,
          position: 'top-right'
        });
      });
      return () => unsubscribe();
    }
  }, []);

  return { token, requestPermission };
};
