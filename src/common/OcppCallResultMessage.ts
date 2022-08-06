import OcppClient from './OcppClient';
import OcppSession from './OcppSession';
import {
  OcppMessageType,
  OcppMessagePayload,
  OcppMessageContext,
  InboundOcppMessage,
  OutboundOcppMessage,
} from './OcppMessage';

class InboundOcppCallResult<
  TPayload extends OcppMessagePayload,
  TClient extends OcppClient = OcppClient,
  TSession extends OcppSession<TClient> = OcppSession<TClient>,
  TContext extends OcppMessageContext<unknown, TClient, TSession> = null
> extends InboundOcppMessage<TClient, TSession, TContext> {
  type: OcppMessageType.CALLRESULT;
  private _data: TPayload;

  constructor(id: string, sender: TClient, data: TPayload, context: TContext) {
    super(id, sender, context);
    this._data = data;
  }

  set data(data: TPayload) {
    this._data = data;
  }

  get data() {
    return this._data;
  }
}

class OutboundOcppCallResult<
  TPayload extends OcppMessagePayload,
  TClient extends OcppClient = OcppClient,
  TSession extends OcppSession<TClient> = OcppSession<TClient>,
  TContext extends OcppMessageContext<unknown, TClient, TSession> = null
> extends OutboundOcppMessage<TClient, TSession, TContext> {
  type: OcppMessageType.CALLRESULT;
  private _data: TPayload;

  constructor(id: string, data: TPayload, recipient?: TClient, context?: TContext) {
    super(id, recipient, context);
    this._data = data;
  }

  set data(data: TPayload) {
    this._data = data;
  }

  get data() {
    return this._data;
  }
}

export { InboundOcppCallResult, OutboundOcppCallResult };
