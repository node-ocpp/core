import { OcppClient } from './OcppSession';
import OcppMessageType from '../types/ocpp/OcppMessageType';
import OcppAction from '../types/ocpp/OcppAction';
import {
  InboundOcppCallResult,
  OutboundOcppCallResult,
} from './OcppCallResultMessage';
import OcppMessage, {
  OcppMessagePayload,
  RespondableOcppMessage,
  ResultingOcppMessage,
} from './OcppMessage';
import {
  InboundOcppMessageHandler,
  OutboundOcppMessageHandler,
} from './OcppHandlers';

interface OcppCallMessage<TPayload extends OcppMessagePayload>
  extends OcppMessage {
  readonly type: OcppMessageType.CALLRESULT;
  action: OcppAction;
  data: TPayload;
}

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

export default OcppCallMessage;
export { InboundOcppCall, OutboundOcppCall };
