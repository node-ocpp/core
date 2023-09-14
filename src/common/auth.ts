import http from 'http';
import { TLSSocket } from 'tls';
import basicAuth, { BasicAuthResult } from 'basic-auth';
import { oneLine } from 'common-tags';

import { BaseHandler, BaseRequest, RequestContext } from './util/handler';
import { Client } from './session';
import ProtocolVersion from '../types/ocpp/version';

abstract class AuthHandler extends BaseHandler<AuthRequest> {}

enum AcceptanceState {
  Pending,
  Accepted,
  Rejected,
}

class AuthRequest extends BaseRequest implements AuthRequest {
  private _state: AcceptanceState;
  private _statusCode: number;

  readonly client: Client;
  readonly protocol: ProtocolVersion;
  readonly req: http.IncomingMessage;

  constructor(
    context: RequestContext,
    clientId: string,
    protocol: ProtocolVersion,
    req: http.IncomingMessage
  ) {
    super(context);
    this.client = new Client(clientId);
    this.protocol = protocol;
    this.req = req;
    this._state = AcceptanceState.Pending;
  }

  accept() {
    if (this.state === AcceptanceState.Rejected) {
      this.context.logger.error(
        oneLine`accept() was called but auth request from client
        with id ${this.client.id} has already been rejected`
      );
      return;
    }

    this._state = AcceptanceState.Accepted;
  }

  reject(statusCode = 401) {
    if (this.state === AcceptanceState.Accepted) {
      this.context.logger.error(
        oneLine`reject() was called but auth request from client
        with id ${this.client.id} has already been accepted`
      );
      return;
    }

    this._state = AcceptanceState.Rejected;
    this._statusCode = statusCode;
  }

  get basicAuth(): BasicAuthResult | undefined {
    return basicAuth(this.req);
  }

  get isEncrypted() {
    return (this.req.socket as TLSSocket).encrypted || false;
  }

  get isCertificateValid() {
    return (this.req.socket as TLSSocket).authorized || false;
  }

  get state() {
    return this._state;
  }

  get statusCode() {
    return this._statusCode;
  }
}

export default AuthHandler;
export { AuthRequest, AcceptanceState };
