import OcppClient from './OcppClient';
import { InboundOcppMessageHandler, OutboundOcppMessageHandler } from './OcppHandlers';

enum OcppMessageType {
  CALL = 2,
  CALLRESULT = 3,
  CALLERROR = 4,
}

type OcppMessageValue =
  | string
  | number
  | boolean
  | Date
  | { [x: string]: OcppMessageValue }
  | Array<OcppMessageValue>;

type OcppMessagePayload = OcppMessageValue | null | {};

abstract class OcppMessage {
  type!: OcppMessageType;
  private _id: string;
  protected _timestamp?: Date;

  constructor(id: string) {
    this._id = id;
    this._timestamp = null;
  }

  get id() {
    return this._id;
  }

  get timestamp() {
    return this._timestamp;
  }
}

abstract class InboundOcppMessage extends OcppMessage {
  protected _sender: OcppClient;

  constructor(id: string, sender: OcppClient) {
    super(id);
    this._timestamp = new Date();
    this._sender = sender;
  }

  get sender() {
    return this._sender;
  }
}

abstract class OutboundOcppMessage extends OcppMessage {
  _recipient?: OcppClient;
  _isSent: boolean;

  constructor(id: string, recipient?: OcppClient) {
    super(id);
    this._recipient = recipient;
    this._isSent = false;
  }

  setSent() {
    this._isSent = true;
    this._timestamp = new Date();
  }

  set recipient(recipient: OcppClient) {
    this.recipient = recipient;
  }

  get recipient() {
    return this._recipient;
  }

  get isSent() {
    return this._isSent;
  }
}

abstract class RespondableOcppMessage<
  TResponse extends OutboundOcppMessage
> extends InboundOcppMessage {
  private _responseHandler?: OutboundOcppMessageHandler<TResponse>;
  private _response?: OutboundOcppMessage;

  constructor(
    id: string,
    sender: OcppClient,
    responseHandler?: OutboundOcppMessageHandler<TResponse>
  ) {
    super(id, sender);
    this._responseHandler = responseHandler || null;
    this._response = null;
  }

  async respond(response: TResponse) {
    if (!this._responseHandler) {
      throw new Error('respond() was called but responseHandler is not set');
    }

    await this._responseHandler.handle(response);
    this._response = response;
  }

  set responseHandler(handler: OutboundOcppMessageHandler<TResponse>) {
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
    id: string,
    recipient?: OcppClient,
    responseHandler?: InboundOcppMessageHandler<TResponse>
  ) {
    super(id, recipient);
    this._responseHandler = responseHandler || null;
    this._response = null;
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
  OcppMessageType,
  OcppMessagePayload,
  InboundOcppMessage,
  OutboundOcppMessage,
  RespondableOcppMessage,
  ResultingOcppMessage,
};
