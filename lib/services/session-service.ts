/**
 * Session Service
 *
 * Manages user sessions and maps session IDs to Plaid access tokens.
 * In production, this should be backed by a database (Redis, PostgreSQL, etc.)
 */

import { randomBytes } from 'crypto';

interface UserSession {
  sessionId: string;
  accessToken: string;
  itemId: string;  // Plaid item ID
  createdAt: Date;
  lastAccessedAt: Date;
}

class SessionService {
  private sessions: Map<string, UserSession> = new Map();

  /**
   * Create a new session with a Plaid access token
   */
  createSession(accessToken: string, itemId: string): string {
    const sessionId = this.generateSessionId();

    const session: UserSession = {
      sessionId,
      accessToken,
      itemId,
      createdAt: new Date(),
      lastAccessedAt: new Date()
    };

    this.sessions.set(sessionId, session);

    console.error(`[SessionService] Created session ${sessionId} for item ${itemId}`);

    return sessionId;
  }

  /**
   * Get access token for a session ID
   */
  getAccessToken(sessionId: string): string | null {
    const session = this.sessions.get(sessionId);

    if (!session) {
      console.error(`[SessionService] Session not found: ${sessionId}`);
      return null;
    }

    // Update last accessed time
    session.lastAccessedAt = new Date();

    return session.accessToken;
  }

  /**
   * Check if a session exists and is valid
   */
  isValidSession(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  /**
   * Delete a session
   */
  deleteSession(sessionId: string): boolean {
    const deleted = this.sessions.delete(sessionId);

    if (deleted) {
      console.error(`[SessionService] Deleted session ${sessionId}`);
    }

    return deleted;
  }

  /**
   * Get session info (without exposing access token)
   */
  getSessionInfo(sessionId: string) {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return null;
    }

    return {
      sessionId: session.sessionId,
      itemId: session.itemId,
      createdAt: session.createdAt,
      lastAccessedAt: session.lastAccessedAt
    };
  }

  /**
   * Generate a secure random session ID
   */
  private generateSessionId(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Clean up old sessions (call this periodically)
   * Removes sessions older than 30 days
   */
  cleanupOldSessions(maxAgeInDays: number = 30): number {
    const now = new Date();
    const maxAge = maxAgeInDays * 24 * 60 * 60 * 1000;

    let deletedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      const age = now.getTime() - session.lastAccessedAt.getTime();

      if (age > maxAge) {
        this.sessions.delete(sessionId);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      console.error(`[SessionService] Cleaned up ${deletedCount} old sessions`);
    }

    return deletedCount;
  }
}

// Export singleton instance
export const sessionService = new SessionService();
