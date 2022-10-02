import { Client } from './session';
import MessageType from '../types/ocpp/type';
import { InboundMessageHandler, ResponseHandler } from './handler';

type MessageValue =
  | string
  | number
  | boolean
  | Date
  | { [x: string]: MessageValue }
  | Array<MessageValue>;

type Payload = MessageValue | null | {};

abstract class OcppMessage {
  readonly type!: MessageType;
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

abstract class InboundMessage extends OcppMessage {
  readonly sender: Client;

  constructor(sender: Client, id: string) {
    super(id);
    this.sender = sender;
    this._timestamp = new Date();
  }
}

abstract class OutboundMessage extends OcppMessage {
  recipient: Client;
  private _isSent: boolean;

  constructor(recipient: Client, id: string) {
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

abstract class RespondableMessage<
  TResponse extends OutboundMessage
> extends InboundMessage {
  private _responseHandler?: ResponseHandler<TResponse>;
  private _response?: OutboundMessage;

  constructor(
    sender: Client,
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

abstract class ResultingMessage<
  TResponse extends InboundMessage
> extends OutboundMessage {
  private _responseHandler?: InboundMessageHandler<TResponse>;
  private _response?: TResponse;

  constructor(
    recipient: Client,
    id: string,
    responseHandler?: InboundMessageHandler<TResponse>
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

  set responseHandler(handler: InboundMessageHandler<TResponse>) {
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
  Payload,
  InboundMessage,
  OutboundMessage,
  RespondableMessage,
  ResultingMessage,
};
