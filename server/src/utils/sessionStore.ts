import admin from 'firebase-admin';
import { SessionData } from '../types';

// Use Firestore as a session store so Cloud Run instances do not rely on memory
// Session documents are stored in collection `sessions` with fields { data, expiresAt }

if (!admin.apps.length) {
  try {
    admin.initializeApp();
  } catch (e) {
    console.warn('firebase-admin initializeApp warning (session store):', e?.message || e);
  }
}

const db = admin.firestore();

const SESSIONS_COLLECTION = process.env.SESSIONS_COLLECTION || 'sessions';
const SESSION_TTL_MS = parseInt(process.env.SESSION_TTL_MS || String(24 * 60 * 60 * 1000), 10); // default 24h

export async function saveSession(sessionId: string, data: SessionData): Promise<void> {
  const docRef = db.collection(SESSIONS_COLLECTION).doc(sessionId);
  const expiresAt = Date.now() + SESSION_TTL_MS;
  await docRef.set({ data, expiresAt, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
}

export async function getSession(sessionId: string): Promise<SessionData | null> {
  const doc = await db.collection(SESSIONS_COLLECTION).doc(sessionId).get();
  if (!doc.exists) return null;
  const payload = doc.data() as any;
  if (!payload) return null;

  if (payload.expiresAt && Date.now() > payload.expiresAt) {
    // expired
    await db.collection(SESSIONS_COLLECTION).doc(sessionId).delete().catch(() => {});
    return null;
  }
  return payload.data as SessionData;
}

export async function updateSession(sessionId: string, data: SessionData): Promise<void> {
  const docRef = db.collection(SESSIONS_COLLECTION).doc(sessionId);
  const expiresAt = Date.now() + SESSION_TTL_MS;
  await docRef.set({ data, expiresAt, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
}

export async function deleteSession(sessionId: string): Promise<void> {
  await db.collection(SESSIONS_COLLECTION).doc(sessionId).delete().catch(() => {});
}

// Provide a best-effort cleanup job for expired sessions (runs in-process — note Cloud Run instances are ephemeral)
export function startSessionCleanup(): void {
  setInterval(async () => {
    try {
      const cutoff = Date.now();
      const snapshot = await db.collection(SESSIONS_COLLECTION).where('expiresAt', '<', cutoff).get();
      const batch = db.batch();
      let removed = 0;
      snapshot.forEach((doc) => {
        batch.delete(doc.ref);
        removed++;
      });
      if (removed > 0) await batch.commit();
      if (removed > 0) console.log(`Cleaned up ${removed} expired sessions from Firestore`);
    } catch (e) {
      // non-fatal
    }
  }, 60 * 60 * 1000); // hourly
}

startSessionCleanup();