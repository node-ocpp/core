import OcppMessageType from '../types/ocpp/OcppMessageType';
import { OcppClient } from './OcppSession';
import { InboundOcppMessageHandler, ResponseHandler } from './OcppHandlers';

type OcppMessageValue =
  | string
  | number
  | boolean
  | Date
  | { [x: string]: OcppMessageValue }
  | Array<OcppMessageValue>;

type OcppMessagePayload = OcppMessageValue | null | {};

abstract class OcppMessage {
  readonly type!: OcppMessageType;
  readonly id: string;
  protected _timestamp?: Date;

  constructor(id: string) {
    this.id = id;
    this._timestamp = null;
  }

  get timestamp() {
    return this._timestamp;
  }
}

abstract class InboundOcppMessage extends OcppMessage {
  readonly sender: OcppClient;

  constructor(sender: OcppClient, id: string) {
    super(id);
    this.sender = sender;
    this._timestamp = new Date();
  }
}

abstract class OutboundOcppMessage extends OcppMessage {
  recipient: OcppClient;
  private _isSent: boolean;

  constructor(recipient: OcppClient, id: string) {
    super(id);
    this.recipient = recipient;
    this._isSent = false;
  }

  setSent() {
    this._isSent = true;
    this._timestamp = new Date();
  }

  get isSent() {
    return this._isSent;
  }
}

abstract class RespondableOcppMessage<
  TResponse extends OutboundOcppMessage
> extends InboundOcppMessage {
  private _responseHandler?: ResponseHandler<TResponse>;
  private _response?: OutboundOcppMessage;

  constructor(
    sender: OcppClient,
    id: string,
    responseHandler?: ResponseHandler<TResponse>
  ) {
    super(sender, id);
    this._responseHandler = responseHandler || null;
    this._response = null;
  }

  async respond(response: TResponse) {
    if (!this._responseHandler) {
      throw new Error('respond() was called but responseHandler is not set');
    }

    await this._responseHandler(response);
    this._response = response;
  }

  set responseHandler(handler: ResponseHandler<TResponse>) {
    this._responseHandler = handler;
  }

  get isResponded() {
    return !!this._response;
  }

  get response() {
    return this._response;
  }
}

abstract class ResultingOcppMessage<
  TResponse extends InboundOcppMessage
> extends OutboundOcppMessage {
  private _responseHandler?: InboundOcppMessageHandler<TResponse>;
  private _response?: TResponse;

  constructor(
    recipient: OcppClient,
    id: string,
    responseHandler?: InboundOcppMessageHandler<TResponse>
  ) {
    super(recipient, id);
    this._responseHandler = responseHandler || null;
  }

  async onResponse(response: TResponse) {
    if (!this._responseHandler) {
      throw new Error('onResponse() was called but responseHandler is not set');
    }

    this._response = response;
    await this._responseHandler.handle(response);
  }

  set responseHandler(handler: InboundOcppMessageHandler<TResponse>) {
    this._responseHandler = handler;
  }

  get hasResponse() {
    return !!this._response;
  }

  get response() {
    return this._response;
  }
}

export default OcppMessage;
export {
  OcppMessagePayload,
  InboundOcppMessage,
  OutboundOcppMessage,
  RespondableOcppMessage,
  ResultingOcppMessage,
};
