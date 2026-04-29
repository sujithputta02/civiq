importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIza" + "SyCgQlBDGDZi2tvB0HEHDHvVuKtVfRBNZhs",
  authDomain: "civiq-494613.firebaseapp.com",
  projectId: "civiq-494613",
  storageBucket: "civiq-494613.firebasestorage.app",
  messagingSenderId: "782079729240",
  appId: "1:782079729240:web:fa3020957426fbb2d6742d"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.ico'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
