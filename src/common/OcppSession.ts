import { InboundOcppCall, OutboundOcppCall } from './OcppCallMessage';
import OcppProtocolVersion from '../types/ocpp/OcppProtocolVersion';

class OcppSession {
  private _isActiveHandler: () => boolean;
  private _dropHandler: () => void;

  readonly client: OcppClient;
  readonly protocol: OcppProtocolVersion;
  pendingInboundMessage?: InboundOcppCall;
  pendingOutboundMessage?: OutboundOcppCall;

  constructor(
    client: OcppClient,
    protocol: OcppProtocolVersion,
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

class OcppClient {
  readonly id: string;

  constructor(id: string) {
    this.id = id;
  }
}

interface OcppSessionService {
  create(): Promise<void>;
  destroy(): Promise<void>;
  count(): Promise<number>;
  add(sesion: OcppSession): Promise<void>;
  has(clientId: string): Promise<boolean>;
  get(clientId: string): Promise<OcppSession | null>;
  update(clientId: string, session: OcppSession): Promise<void>;
  remove(clientId: string): Promise<void>;
}

export default OcppSession;
export { OcppClient, OcppSessionService };
