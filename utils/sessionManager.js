class SessionManager {
    constructor() {
      this.sessions = new Map();
    }
  
    // Get user session
    getSession(phoneNumber) {
      return this.sessions.get(phoneNumber) || null;
    }
  
    // Set user session
    setSession(phoneNumber, sessionData) {
      this.sessions.set(phoneNumber, {
        ...sessionData,
        lastActivity: new Date()
      });
    }
  
    // Update session data
    updateSession(phoneNumber, updates) {
      const session = this.getSession(phoneNumber);
      if (session) {
        this.setSession(phoneNumber, { ...session, ...updates });
      }
    }
  
    // Clear user session
    clearSession(phoneNumber) {
      this.sessions.delete(phoneNumber);
    }
  
    // Clean up old sessions (older than 1 hour)
    cleanupSessions() {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      for (const [phoneNumber, session] of this.sessions.entries()) {
        if (session.lastActivity < oneHourAgo) {
          this.sessions.delete(phoneNumber);
        }
      }
    }
  
    // Get all active sessions count
    getActiveSessionsCount() {
      return this.sessions.size;
    }
  }
  
  // Singleton instance
  const sessionManager = new SessionManager();
  
  // Clean up sessions every 30 minutes
  setInterval(() => {
    sessionManager.cleanupSessions();
  }, 30 * 60 * 1000);
  
  module.exports = sessionManager;