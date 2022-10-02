import Session, { SessionService } from '../session';

class LocalSessionService implements SessionService {
  private sessions: Map<string, Session>;

  async create() {
    if (!this.sessions) {
      this.sessions = new Map<string, Session>();
    }
  }

  async destroy() {
    delete this.sessions;
  }

  async count() {
    return this.sessions.size;
  }

  async add(sesion: Session) {
    if (await this.has(sesion.client.id)) {
      throw new Error(
        `Session for client with id ${sesion.client.id} already exists`
      );
    }

    this.sessions.set(sesion.client.id, sesion);
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
