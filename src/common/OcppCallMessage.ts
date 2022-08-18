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

interface OcppCallMessage<
  TAction extends OcppAction = OcppAction,
  TPayload extends OcppMessagePayload = OcppMessagePayload
> extends OcppMessage {
  readonly type: OcppMessageType.CALL;
  action: TAction;
  data: TPayload;
}

class InboundOcppCall<
    TAction extends OcppAction = OcppAction,
    TPayload extends OcppMessagePayload = OcppMessagePayload,
    TResponsePayload extends OcppMessagePayload = OcppMessagePayload,
    TResponse extends OutboundOcppCallResult<TResponsePayload> = OutboundOcppCallResult<TResponsePayload>
  >
  extends RespondableOcppMessage<TResponse>
  implements OcppCallMessage<TAction, TPayload>
{
  type: OcppMessageType.CALL;
  action: TAction;
  data: TPayload;

  constructor(
    id: string,
    action: TAction,
    data: TPayload,
    sender: OcppClient,
    responseHandler?: OutboundOcppMessageHandler<TResponse>
  ) {
    super(id, sender, responseHandler);
    this.action = action;
    this.data = data;
  }
}

class OutboundOcppCall<
    TAction extends OcppAction = OcppAction,
    TPayload extends OcppMessagePayload = OcppMessagePayload,
    TResponsePayload extends OcppMessagePayload = OcppMessagePayload,
    TResponse extends InboundOcppCallResult<TResponsePayload> = InboundOcppCallResult<TResponsePayload>
  >
  extends ResultingOcppMessage<TResponse>
  implements OcppCallMessage<TAction, TPayload>
{
  type: OcppMessageType.CALL;
  action: TAction;
  data: TPayload;

  constructor(
    id: string,
    action: TAction,
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
