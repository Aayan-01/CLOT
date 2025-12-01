import admin from 'firebase-admin';

// Firestore will use application default credentials in Cloud Run.
// If you want to use a service account key locally, set GOOGLE_APPLICATION_CREDENTIALS
// to the path of the key json.

if (!admin.apps.length) {
  try {
    admin.initializeApp();
  } catch (e) {
    console.warn('Firebase admin initializeApp warning:', e?.message || e);
  }
}

const db = admin.firestore();

export async function logAnalysis(sessionId: string, payload: any) {
  try {
    const docRef = db.collection('ai_logs').doc(sessionId);
    await docRef.set({
      ...payload,
      sessionId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Failed to write AI log to Firestore:', error?.message || error);
    throw error;
  }
}

export default { logAnalysis };
