import { OcppClient } from './OcppSession';
import {
  InboundOcppCallResult,
  OutboundOcppCallResult,
} from './OcppCallResultMessage';
import {
  OcppMessageType,
  OcppMessagePayload,
  RespondableOcppMessage,
  ResultingOcppMessage,
} from './OcppMessage';
import {
  InboundOcppMessageHandler,
  OutboundOcppMessageHandler,
} from './OcppHandlers';

class InboundOcppCall<
  TPayload extends OcppMessagePayload = unknown,
  TResponsePayload extends OcppMessagePayload = unknown,
  TResponse extends OutboundOcppCallResult<TResponsePayload> = undefined
> extends RespondableOcppMessage<TResponse> {
  type: OcppMessageType.CALL;
  action: string;
  data: TPayload;

  constructor(
    id: string,
    sender: OcppClient,
    action: string,
    data: TPayload,
    responseHandler?: OutboundOcppMessageHandler<TResponse>
  ) {
    super(id, sender, responseHandler);
    this.action = action;
    this.data = data;
  }
}

class OutboundOcppCall<
  TPayload extends OcppMessagePayload = unknown,
  TResponsePayload extends OcppMessagePayload = unknown,
  TResponse extends InboundOcppCallResult<TResponsePayload> = undefined
> extends ResultingOcppMessage<TResponse> {
  type: OcppMessageType.CALL;
  action: string;
  data: TPayload;

  constructor(
    id: string,
    action: string,
    data: TPayload,
    recipient?: OcppClient,
    responseHandler?: InboundOcppMessageHandler<TResponse>
  ) {
    super(id, recipient, responseHandler);
    this.action = action;
    this.data = data;
  }
}

export { InboundOcppCall, OutboundOcppCall };
