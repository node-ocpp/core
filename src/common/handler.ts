import { AsyncHandler } from './util/handler';
import { Client } from './session';
import OcppMessage, { InboundMessage, OutboundMessage } from './message';
import ProtocolVersion from '../types/ocpp/version';

abstract class AuthenticationHandler<
  TRequest extends AuthenticationRequest = AuthenticationRequest
> extends AsyncHandler<TRequest> {}

abstract class AuthenticationRequest {
  private _accepted: boolean;
  private _rejected: boolean;
  private _protocol: ProtocolVersion;

  readonly client: Client;
  readonly protocols: ProtocolVersion[];
  readonly password?: string;
  readonly certificate?: unknown;

  constructor() {
    this._accepted = this._rejected = false;
  }

  accept(protocol: ProtocolVersion = this.protocols[0]) {
    if (this.isAccepted || this.isRejected) {
      throw new Error(
        `accept() was called but authentication attempt from
        client with id ${this.client.id} has already been
        ${this.isAccepted ? 'accepted' : this.isRejected ? 'rejected' : ''}`
      );
    }

    this._accepted = true;
    this._protocol = protocol;
  }

  reject(reason?: unknown) {
    if (this.isAccepted || this.isRejected) {
      throw new Error(
        `reject() was called but authentication attempt from
        client with id ${this.client.id} has already been
        ${this.isAccepted ? 'accepted' : this.isRejected ? 'rejected' : ''}`
      );
    }

    this._rejected = true;
  }

  get isAccepted() {
    return this._accepted;
  }

  get isRejected() {
    return this._rejected;
  }

  get protocol() {
    return this._protocol;
  }
}

abstract class OcppMessageHandler<
  TMessage extends OcppMessage = OcppMessage
> extends AsyncHandler<TMessage> {}

abstract class InboundMessageHandler<
  TMessage extends InboundMessage = InboundMessage
> extends OcppMessageHandler<TMessage> {}

abstract class OutboundMessageHandler<
  TMessage extends OutboundMessage = OutboundMessage
> extends OcppMessageHandler<TMessage> {}

type ResponseHandler<TResponse extends OutboundMessage> = (
  response: TResponse
) => Promise<void>;

export {
  AsyncHandler,
  AuthenticationHandler,
  AuthenticationRequest,
  InboundMessageHandler,
  OutboundMessageHandler,
  ResponseHandler,
};
