import Session, { SessionService } from '../session';

class LocalSessionService implements SessionService {
  private sessions: Map<string, Session>;

  constructor() {
    this.sessions = new Map<string, Session>();
  }

  async set(clientId: string, session: Session) {
    if (session === null) {
      this.sessions.delete(clientId);
    } else {
      this.sessions.set(clientId, session);
    }
  }

  async get(clientId: string) {
    return this.sessions.get(clientId) || null;
  }

  async has(clientId: string) {
    return this.sessions.has(clientId);
  }

  async count() {
    return this.sessions.size;
  }
}

export default LocalSessionService;
