import OcppMessage from './OcppMessage';
import OcppClient from './OcppClient';
import { OcppProtocolVersion } from './OcppEndpoint';

abstract class OcppSession<TClient extends OcppClient> {
  abstract get isActive(): boolean;

  private _client: TClient;
  private _protocol: OcppProtocolVersion;
  private _pendingMessage!: OcppMessage;

  constructor(client: TClient, protocol: OcppProtocolVersion) {
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

interface OcppSessionService<
  TClient extends OcppClient = OcppClient,
  TSession extends OcppSession<TClient> = OcppSession<TClient>
> {
  init(): Promise<void>;
  add(sesion: TSession): Promise<void>;
  has(session: TSession): Promise<boolean>;
  has(clientId: string): Promise<boolean>;
  get(clientId: string): Promise<TSession>;
  update(clientId: string, newSession: TSession): Promise<void>;
  update(oldSession: TSession, newSession: TSession): Promise<void>;
  remove(session: TSession): Promise<void>;
  remove(clientId: string): Promise<void>;
}

export default OcppSession;
export { OcppSessionService };
