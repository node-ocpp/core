import OcppMessage from './OcppMessage';
import OcppClient from './OcppClient';

abstract class OcppSession<TClient extends OcppClient> {
  abstract get isActive(): boolean;

  private _client: TClient;
  private _pendingMessage!: OcppMessage;

  constructor(client: TClient) {
    this._client = client;
  }

  get client(): TClient {
    return this._client;
  }

  get pendingMessage() {
    return this._pendingMessage;
  }

  set pendingMessage(message: OcppMessage) {
    this._pendingMessage = message;
  }
}

export default OcppSession;
