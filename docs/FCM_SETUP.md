# Firebase Cloud Messaging (FCM) Setup Guide

## Overview

This guide explains how to set up Firebase Cloud Messaging (FCM) for push notifications in the Civiq application.

## Prerequisites

- Firebase project created
- Firebase Console access
- Google Cloud Console access
- Development environment set up

## Step 1: Get VAPID Key from Firebase Console

### 1.1 Navigate to Cloud Messaging Settings

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** (gear icon)
4. Click on **Cloud Messaging** tab

### 1.2 Copy Web Push Certificate

1. Under "Web Push certificates", you should see a certificate
2. If not, click **Generate Key Pair**
3. Copy the **Public key** (87-character string starting with `B`)

### 1.3 Add to Environment Variables

Create or update `.env.local` in `apps/web/`:

```env
NEXT_PUBLIC_VAPID_KEY=your_87_character_public_key_here
```

**Example:**
```env
NEXT_PUBLIC_VAPID_KEY=BKxyz1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890
```

## Step 2: Configure API Key Permissions

### 2.1 Go to Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **APIs & Services** > **Credentials**

### 2.2 Find Your API Key

1. Look for your API key in the "API keys" section
2. It should be labeled with your Firebase project name
3. Click on it to edit

### 2.3 Add Firebase Cloud Messaging API

1. Under **API restrictions**, select **Restrict key**
2. In the dropdown, search for **"Firebase Cloud Messaging API"**
3. Select it from the list
4. Click **Save**

**Important:** This is the most common cause of the 401 error!

### 2.4 Verify Other APIs

Make sure these APIs are also enabled:

1. Go to **APIs & Services** > **Enabled APIs & services**
2. Search for and enable:
   - Firebase Cloud Messaging API
   - Firebase Installations API
   - Firebase Realtime Database API
   - Cloud Firestore API

## Step 3: Verify Firebase Configuration

### 3.1 Check Environment Variables

Ensure all Firebase environment variables are set in `apps/web/.env.local`:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# FCM Configuration
NEXT_PUBLIC_VAPID_KEY=your_vapid_key
```

### 3.2 Verify Service Worker

Check that the service worker file exists:

```bash
ls -la apps/web/public/firebase-messaging-sw.js
```

If it doesn't exist, create it:

```javascript
// apps/web/public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.ico',
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
```

## Step 4: Test FCM Setup

### 4.1 Start Development Server

```bash
npm run dev
```

### 4.2 Open Browser Console

1. Open your app in browser
2. Open Developer Tools (F12)
3. Go to **Console** tab

### 4.3 Request Notification Permission

1. Click the "Enable Push Alerts" button on the dashboard
2. Browser will ask for notification permission
3. Click **Allow**

### 4.4 Check Console Output

Look for these success messages:

```
✅ Service worker registered successfully
✅ FCM token obtained successfully
✅ FCM token saved to Firestore
```

### 4.5 Troubleshooting

If you see errors, check:

1. **401 Error**: API key doesn't have FCM API permission
   - Go to Google Cloud Console
   - Add "Firebase Cloud Messaging API" to API restrictions
   - Restart development server

2. **messaging/token-subscribe-failed**: Same as above

3. **Service worker registration failed**: 
   - Check that `firebase-messaging-sw.js` exists in `public/`
   - Check browser console for CORS errors

4. **VAPID key invalid**:
   - Copy the full 87-character key from Firebase Console
   - Ensure no extra spaces or characters
   - Restart development server

## Step 5: Send Test Notification

### 5.1 From Firebase Console

1. Go to Firebase Console
2. Go to **Messaging** (under Engage)
3. Click **Create your first campaign**
4. Select **Firebase Notifications**
5. Enter title and message
6. Click **Send test message**
7. Select your user
8. Click **Send**

### 5.2 From Cloud Functions

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

export const sendNotification = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { title, body, userId } = data;

  // Get user's FCM token
  const userDoc = await admin.firestore().collection('users').doc(userId).get();
  const fcmToken = userDoc.data()?.fcmToken;

  if (!fcmToken) {
    throw new functions.https.HttpsError('not-found', 'User FCM token not found');
  }

  // Send notification
  const message = {
    notification: {
      title,
      body,
    },
    token: fcmToken,
  };

  const response = await admin.messaging().send(message);
  console.log('Successfully sent message:', response);

  return { success: true, messageId: response };
});
```

## Troubleshooting

### Common Issues

#### 1. 401 Unauthorized Error

**Cause**: API key doesn't have Firebase Cloud Messaging API permission

**Solution**:
1. Go to Google Cloud Console
2. APIs & Services > Credentials
3. Edit your API key
4. Add "Firebase Cloud Messaging API" to API restrictions
5. Restart development server

#### 2. messaging/token-subscribe-failed

**Cause**: Same as above - API key restrictions

**Solution**: Follow the same steps as above

#### 3. Service Worker Registration Failed

**Cause**: Service worker file not found or CORS issue

**Solution**:
1. Verify `firebase-messaging-sw.js` exists in `public/`
2. Check browser console for CORS errors
3. Ensure service worker is accessible at `/firebase-messaging-sw.js`

#### 4. VAPID Key Invalid

**Cause**: Incorrect or incomplete VAPID key

**Solution**:
1. Go to Firebase Console > Project Settings > Cloud Messaging
2. Copy the full Web Push Certificate (87 characters)
3. Paste into `.env.local` as `NEXT_PUBLIC_VAPID_KEY`
4. Restart development server

#### 5. Notifications Not Showing

**Cause**: User denied permission or browser doesn't support notifications

**Solution**:
1. Check browser notification settings
2. Allow notifications for your domain
3. Test in a different browser
4. Check browser console for errors

### Debug Mode

Enable detailed logging:

```typescript
// In useNotifications.ts
const DEBUG = true;

if (DEBUG) {
  console.log('FCM Debug Info:', {
    messaging: !!messaging,
    user: !!user,
    vapidKey: process.env.NEXT_PUBLIC_VAPID_KEY?.substring(0, 10) + '...',
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.substring(0, 10) + '...',
  });
}
```

## Production Deployment

### 1. Set Environment Variables

In your hosting platform (Vercel, Firebase Hosting, etc.):

```env
NEXT_PUBLIC_VAPID_KEY=your_vapid_key
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### 2. Verify Service Worker

Ensure `firebase-messaging-sw.js` is deployed to your hosting

### 3. Test in Production

1. Deploy your app
2. Open in browser
3. Request notification permission
4. Send test notification from Firebase Console
5. Verify notification appears

## Resources

- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [Web Push Protocol](https://tools.ietf.org/html/draft-thomson-webpush-protocol)
- [Firebase Console](https://console.firebase.google.com/)
- [Google Cloud Console](https://console.cloud.google.com/)

## Support

If you encounter issues:

1. Check this guide
2. Review browser console for errors
3. Check Firebase Console logs
4. Review Google Cloud Console API restrictions
5. Contact Firebase support

---

**Last Updated**: April 2026
**Version**: 1.0.0
