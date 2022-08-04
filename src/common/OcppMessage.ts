import OcppClient from './OcppClient';

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

type OcppResponseHandler<TResponse extends OcppMessage> = (response: TResponse) => Promise<void>;

abstract class RespondableOcppMessage<
  TResponse extends OutboundOcppMessage
> extends InboundOcppMessage {
  private _responseHandler?: OcppResponseHandler<TResponse>;
  private _isResponded: boolean;
  private _response?: OutboundOcppMessage;

  constructor(id: string, sender: OcppClient, responseHandler?: OcppResponseHandler<TResponse>) {
    super(id, sender);
    this._responseHandler = responseHandler || null;
    this._isResponded = false;
    this._response = null;
  }

  async respond(response: TResponse) {
    if (!this._responseHandler) {
      throw new Error('respond() was called but responseHandler is not set');
    }

    await this._responseHandler(response);
    this._isResponded = true;
    this._response = response;
  }

  set responseHandler(handler: OcppResponseHandler<TResponse>) {
    this._responseHandler = handler;
  }

  get isResponded() {
    return this._isResponded;
  }

  get response() {
    return this._response;
  }
}

abstract class ResultingOcppMessage<
  TResponse extends InboundOcppMessage
> extends OutboundOcppMessage {
  private _responseHandler?: OcppResponseHandler<TResponse>;
  private _hasResponse: boolean;
  private _response?: TResponse;

  constructor(
    id: string,
    recipient?: OcppClient,
    responseHandler?: OcppResponseHandler<TResponse>
  ) {
    super(id, recipient);
    this._responseHandler = responseHandler || null;
    this._hasResponse = false;
    this._response = null;
  }

  onResponse(response: TResponse) {
    this._hasResponse = true;
    this._response = response;
    this._responseHandler(response);
  }

  set responseHandler(handler: OcppResponseHandler<TResponse>) {
    this._responseHandler = handler;
  }

  get hasResponse() {
    return this._hasResponse;
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
