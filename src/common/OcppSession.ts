import OcppMessage from './OcppMessage';
import OcppClient from './OcppClient';

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

type OcppProtocolVersion = 'ocpp1.5' | 'ocpp1.6' | 'ocpp2.0' | 'ocpp2.0.1';

export default OcppSession;
