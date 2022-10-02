import ProtocolVersion from '../types/ocpp/version';
import { InboundCall, OutboundCall } from './call';

class Session {
  private _isActiveHandler: () => boolean;
  private _dropHandler: () => void;

  readonly client: Client;
  readonly protocol: ProtocolVersion;
  pendingInboundMessage?: InboundCall;
  pendingOutboundMessage?: OutboundCall;

  constructor(
    client: Client,
    protocol: ProtocolVersion,
    isActiveHandler?: () => boolean,
    dropHandler?: () => void
  ) {
    this.client = client;
    this.protocol = protocol;
    this._isActiveHandler = isActiveHandler;
    this._dropHandler = dropHandler;
  }

  get isActive() {
    if (!this._isActiveHandler) {
      throw new Error('isActive() was called but isActiveHandler is not set');
    }

    return this._isActiveHandler();
  }

  drop() {
    if (!this._dropHandler) {
      throw new Error('drop() was called but dropHandler is not set');
    }

    this._dropHandler();
  }

  set isActiveHandler(handler: () => boolean) {
    this._isActiveHandler = handler;
  }

  set dropHandler(handler: () => void) {
    this._dropHandler = handler;
  }
}

class Client {
  readonly id: string;

  constructor(id: string) {
    this.id = id;
  }
}

interface SessionService {
  create(): Promise<void>;
  destroy(): Promise<void>;
  count(): Promise<number>;
  add(sesion: Session): Promise<void>;
  has(clientId: string): Promise<boolean>;
  get(clientId: string): Promise<Session | null>;
  update(clientId: string, session: Session): Promise<void>;
  remove(clientId: string): Promise<void>;
}

export default Session;
export { Client, SessionService };
