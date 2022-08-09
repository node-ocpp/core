import OcppSession, { OcppSessionService } from '../OcppSession';

class LocalSessionService implements OcppSessionService {
  private sessions: Map<string, OcppSession>;

  async create() {
    this.sessions = new Map<string, OcppSession>();
  }

  async destroy() {
    delete this.sessions;
  }

  async count(): Promise<number> {
    return this.sessions.size;
  }

  async add(sesion: OcppSession) {
    if (this.has(sesion.client.id)) {
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
    return this.sessions.get(clientId);
  }

  async update(clientId: string, session: OcppSession) {
    if (!this.has(clientId)) {
      throw new Error(`No session for client with id ${clientId} exists`);
    }

    this.sessions.set(clientId, session);
  }

  async remove(clientId: string) {
    if (!this.has(clientId)) {
      throw new Error(`No session for client with id ${clientId} exists`);
    }

    this.sessions.delete(clientId);
  }
}

export default LocalSessionService;
