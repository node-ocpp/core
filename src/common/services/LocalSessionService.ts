import OcppSession, { OcppSessionService } from '../OcppSession';

class LocalSessionService implements OcppSessionService {
  private sessions: Record<string, OcppSession>;

  async init() {
    this.sessions = {};
  }

  async add(sesion: OcppSession) {
    this.sessions[sesion.client.id] = sesion;
  }

  async has(clientId: string) {
    return !!this.sessions[clientId];
  }

  async get(clientId: string) {
    return this.sessions[clientId] || null;
  }

  async update(clientId: string, session: OcppSession) {
    if (!this.has(clientId)) {
      throw new Error(`No session for client with id ${clientId} exists`);
    }

    this.sessions[clientId] = session;
  }

  async remove(clientId: string) {
    if (!this.has(clientId)) {
      throw new Error(`No session for client with id ${clientId} exists`);
    }

    delete this.sessions[clientId];
  }
}

export default LocalSessionService;
