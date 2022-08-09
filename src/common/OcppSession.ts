import OcppMessage from './OcppMessage';
import OcppClient from './OcppClient';
import { OcppProtocolVersion } from './OcppEndpoint';

abstract class OcppSession {
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
  has(clientId: string): Promise<boolean>;
  get(clientId: string): Promise<OcppSession | null>;
  update(clientId: string, session: OcppSession): Promise<void>;
  remove(clientId: string): Promise<void>;
}

export default OcppSession;
export { OcppSessionService };
