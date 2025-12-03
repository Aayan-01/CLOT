import admin from 'firebase-admin';

// Firestore will use application default credentials in Cloud Run.
// If you want to use a service account key locally, set GOOGLE_APPLICATION_CREDENTIALS
// to the path of the key json.

let db: admin.firestore.Firestore | null = null;

function initializeFirestore() {
  if (db) {
    return db;
  }

  if (!admin.apps.length) {
    try {
      admin.initializeApp();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn('Firebase admin initializeApp warning:', msg);
    }
  }

  db = admin.firestore();

  // Prevent Firestore write failures caused by undefined values in objects.
  // In production we prefer ignoring undefined properties so telemetry/log docs don't fail.
  try {
    db.settings({ ignoreUndefinedProperties: true });
  } catch (e) {
    // Some older SDKs may not support this setting — log and continue
    const msg = e instanceof Error ? e.message : String(e);
    console.warn('Could not apply Firestore settings(ignoreUndefinedProperties):', msg);
  }

  return db;
}

// Initialize on module load
const firestore = initializeFirestore();

export async function logAnalysis(sessionId: string, payload: any) {
  try {
    if (!firestore) {
      throw new Error('Firestore not initialized. Check GOOGLE_APPLICATION_CREDENTIALS environment variable.');
    }

    if (!sessionId || typeof sessionId !== 'string') {
      throw new Error(`Invalid sessionId: ${sessionId}. Expected non-empty string.`);
    }

    const docRef = firestore.collection('ai_logs').doc(sessionId);

    // Recursively remove undefined values to avoid Firestore write errors for older SDKs
    const sanitize = (input: any): any => {
      if (input === undefined) return undefined;
      if (input === null) return null;
      if (Array.isArray(input)) return input.map(sanitize).filter((v) => v !== undefined);
      if (typeof input === 'object') {
        const out: any = {};
        for (const [k, v] of Object.entries(input)) {
          const s = sanitize(v);
          if (s !== undefined) out[k] = s;
        }
        return out;
      }
      return input;
    };

    const sanitizedPayload = sanitize(payload);

    await docRef.set({
      ...sanitizedPayload,
      sessionId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return docRef.id;
  } catch (error: any) {
    const msg = error instanceof Error ? error.message : String(error);
    const errorCode = error?.code || 'UNKNOWN';
    const errorDetails = error?.details || '';
    
    console.error('Failed to write AI log to Firestore:', {
      message: msg,
      code: errorCode,
      details: errorDetails,
      sessionId,
    });
    
    // Log additional gRPC error info if available
    if (error?.metadata) {
      console.error('gRPC metadata:', error.metadata);
    }
    
    throw error;
  }
}

export default { logAnalysis };
