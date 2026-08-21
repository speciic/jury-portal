import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

if (!getApps().length) {
  initializeApp(); // Uses default credentials in Cloud Functions
}

export const adminDb = getFirestore();
export const adminAuth = getAuth();
