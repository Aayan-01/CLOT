import { SessionData } from '../types';

/**
 * In-memory session store
 * For production, consider using Redis or a database
 */
const sessions = new Map<string, SessionData>();

// Session expiry time (24 hours)
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000;

interface SessionWithExpiry {
  data: SessionData;
  expiresAt: number;
}

const sessionsWithExpiry = new Map<string, SessionWithExpiry>();

export function saveSession(sessionId: string, data: SessionData): void {
  sessionsWithExpiry.set(sessionId, {
    data,
    expiresAt: Date.now() + SESSION_EXPIRY_MS,
  });
}

export function getSession(sessionId: string): SessionData | null {
  const session = sessionsWithExpiry.get(sessionId);
  
  if (!session) {
    return null;
  }

  // Check if session has expired
  if (Date.now() > session.expiresAt) {
    sessionsWithExpiry.delete(sessionId);
    return null;
  }

  return session.data;
}

export function updateSession(sessionId: string, data: SessionData): void {
  const session = sessionsWithExpiry.get(sessionId);
  
  if (session) {
    session.data = data;
    // Extend expiry on update
    session.expiresAt = Date.now() + SESSION_EXPIRY_MS;
  }
}

export function deleteSession(sessionId: string): void {
  sessionsWithExpiry.delete(sessionId);
}

/**
 * Cleanup expired sessions periodically
 */
export function startSessionCleanup(): void {
  setInterval(() => {
    const now = Date.now();
    const expiredSessions: string[] = [];

    sessionsWithExpiry.forEach((session, sessionId) => {
      if (now > session.expiresAt) {
        expiredSessions.push(sessionId);
      }
    });

    expiredSessions.forEach((sessionId) => {
      sessionsWithExpiry.delete(sessionId);
    });

    if (expiredSessions.length > 0) {
      console.log(`Cleaned up ${expiredSessions.length} expired sessions`);
    }
  }, 60 * 60 * 1000); // Run every hour
}

// Start cleanup on module load
startSessionCleanup();