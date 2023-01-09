import Session, { SessionService } from '../session';

class LocalSessionService implements SessionService {
  private sessions: Map<string, Session>;

  constructor() {
    this.sessions = new Map<string, Session>();
  }

  async count() {
    return this.sessions.size;
  }

  async add(session: Session) {
    this.sessions.set(session.client.id, session);
  }

  async has(clientId: string) {
    return this.sessions.has(clientId);
  }

  async get(clientId: string) {
    return this.sessions.get(clientId) || null;
  }

  async update(clientId: string, session: Session) {
    if (await !this.has(clientId)) {
      throw new Error(`No session for client with id ${clientId} exists`);
    }

    this.sessions.set(clientId, session);
  }

  async remove(clientId: string) {
    if (await !this.has(clientId)) {
      throw new Error(`No session for client with id ${clientId} exists`);
    }

    this.sessions.delete(clientId);
  }
}

export default LocalSessionService;
