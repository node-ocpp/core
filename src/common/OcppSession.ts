import OcppMessage from './OcppMessage';
import OcppClient from './OcppClient';
import { OcppProtocolVersion } from './OcppEndpoint';

abstract class OcppSession {
  abstract get isActive(): boolean;

  private _client: OcppClient;
  private _protocol: OcppProtocolVersion;
  private _pendingMessage?: OcppMessage;

  constructor(client: OcppClient, protocol: OcppProtocolVersion) {
    this._client = client;
    this._protocol = protocol;
  }

  get client() {
    return this._client;
  }

  get protocol() {
    return this._protocol;
  }

  get pendingMessage() {
    return this._pendingMessage;
  }

  set pendingMessage(message: OcppMessage) {
    this._pendingMessage = message;
  }
}

interface OcppSessionService {
  init(): Promise<void>;
  add(sesion: OcppSession): Promise<void>;
  has(session: OcppSession): Promise<boolean>;
  has(clientId: string): Promise<boolean>;
  get(clientId: string): Promise<OcppSession>;
  update(clientId: string, newSession: OcppSession): Promise<void>;
  update(oldSession: OcppSession, newSession: OcppSession): Promise<void>;
  remove(session: OcppSession): Promise<void>;
  remove(clientId: string): Promise<void>;
}

export default OcppSession;
export { OcppSessionService };
