import OcppClient from './OcppClient';
import OcppSession from './OcppSession';
import { InboundOcppCallResult, OutboundOcppCallResult } from './OcppCallResultMessage';
import {
  OcppMessageType,
  OcppMessagePayload,
  OcppMessageContext,
  RespondableOcppMessage,
  ResultingOcppMessage,
} from './OcppMessage';
import { InboundOcppCallError, OutboundOcppCallError } from './OcppCallErrorMessage';
import { InboundOcppMessageHandler, OutboundOcppMessageHandler } from './OcppHandlers';

declare type InboundOcppCallResponse<TPayload extends OcppMessagePayload> =
  | OutboundOcppCallResult<TPayload>
  | OutboundOcppCallError;

class InboundOcppCall<
  TPayload extends OcppMessagePayload,
  TResponsePayload extends OcppMessagePayload,
  TResponse extends InboundOcppCallResponse<TResponsePayload>,
  TClient extends OcppClient = OcppClient,
  TSession extends OcppSession<TClient> = OcppSession<TClient>,
  TContext extends OcppMessageContext<unknown, TClient, TSession> = null
> extends RespondableOcppMessage<TResponse, TClient, TSession, TContext> {
  type: OcppMessageType.CALL;
  private _action: string;
  private _data: TPayload;

  constructor(
    id: string,
    sender: OcppClient,
    action: string,
    data: TPayload,
    responseHandler?: OutboundOcppMessageHandler<TResponse>,
    context?: TContext
  ) {
    super(id, sender, responseHandler, context);
    this._action = action;
    this._data = data;
  }

  set action(action: string) {
    this._action = action;
  }

  get action() {
    return this._action;
  }

  set data(data: TPayload) {
    this._data = data;
  }

  get data() {
    return this._data;
  }
}

declare type OutboundOcppCallResponse<TPayload extends OcppMessagePayload> =
  | InboundOcppCallResult<TPayload>
  | InboundOcppCallError;

class OutboundOcppCall<
  TPayload extends OcppMessagePayload,
  TResponsePayload extends OcppMessagePayload,
  TResponse extends OutboundOcppCallResponse<TResponsePayload>,
  TClient extends OcppClient = OcppClient,
  TSession extends OcppSession<TClient> = OcppSession<TClient>,
  TContext extends OcppMessageContext<unknown, TClient, TSession> = null
> extends ResultingOcppMessage<TResponse, TClient, TSession, TContext> {
  type: OcppMessageType.CALL;
  private _action: string;
  private _data: TPayload;

  constructor(
    id: string,
    action: string,
    data: TPayload,
    recipient?: TClient,
    responseHandler?: InboundOcppMessageHandler<TResponse>,
    context?: TContext
  ) {
    super(id, recipient, responseHandler, context);
    this._action = action;
    this._data = data;
  }

  set action(action: string) {
    this._action = action;
  }

  get action() {
    return this._action;
  }

  set data(data: TPayload) {
    this._data = data;
  }

  get data() {
    return this._data;
  }
}

export { InboundOcppCall, OutboundOcppCall };
