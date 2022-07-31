import OcppClient from './OcppClient';

abstract class OcppSession<TClient extends OcppClient> {
  private _client: TClient;

  constructor(client: TClient) {
    this._client = client;
  }

  abstract get client(): TClient;
}

export default OcppSession;
