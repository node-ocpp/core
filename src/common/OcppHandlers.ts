import { AsyncHandler } from './util/Handler';
import { OcppClient } from './OcppSession';
import OcppMessage, {
  InboundOcppMessage,
  OutboundOcppMessage,
} from './OcppMessage';
import OcppProtocolVersion from '../types/ocpp/OcppProtocolVersion';

abstract class OcppAuthenticationHandler<
  TRequest extends OcppAuthenticationRequest = OcppAuthenticationRequest
> extends AsyncHandler<TRequest> {}

abstract class OcppAuthenticationRequest {
  private _accepted: boolean;
  private _rejected: boolean;

  readonly client: OcppClient;
  readonly protocol: OcppProtocolVersion;
  readonly password?: string;
  readonly certificate?: unknown;

  constructor() {
    this._accepted = this._rejected = false;
  }

  accept() {
    if (this.isAccepted || this.isRejected) {
      throw new Error(
        `accept() was called but authentication attempt from
        client with id ${this.client.id} has already been
        ${this.isAccepted ? 'accepted' : this.isRejected ? 'rejected' : ''}`
      );
    }

    this._accepted = true;
  }

  reject(reason?: any) {
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
}

abstract class OcppMessageHandler<
  TMessage extends OcppMessage = OcppMessage
> extends AsyncHandler<TMessage> {}

abstract class InboundOcppMessageHandler<
  TMessage extends InboundOcppMessage = InboundOcppMessage
> extends OcppMessageHandler<TMessage> {}

abstract class OutboundOcppMessageHandler<
  TMessage extends OutboundOcppMessage = OutboundOcppMessage
> extends OcppMessageHandler<TMessage> {}

export {
  AsyncHandler,
  OcppAuthenticationHandler,
  OcppAuthenticationRequest,
  InboundOcppMessageHandler,
  OutboundOcppMessageHandler,
};
