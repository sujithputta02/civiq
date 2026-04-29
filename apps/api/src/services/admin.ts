import * as admin from 'firebase-admin';
import { Firestore } from '@google-cloud/firestore';

if (!admin.apps.length) {
  // Uses Application Default Credentials (ADC) or GOOGLE_APPLICATION_CREDENTIALS environment variable.
  // In Cloud Run, this inherits the default service account natively.
  admin.initializeApp();
}

// Instantiate Firestore directly to support the named database "civiq"
export const adminDb = new Firestore({
  databaseId: 'civiq'
});
