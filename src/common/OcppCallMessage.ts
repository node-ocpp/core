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
import { InboundOcppMessageHandler, ResponseHandler } from './OcppHandlers';

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
    sender: OcppClient,
    id: string,
    action: TAction,
    data: TPayload,
    responseHandler?: ResponseHandler<TResponse>
  ) {
    super(sender, id, responseHandler);
    this.type = OcppMessageType.CALL;
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
    recipient: OcppClient,
    id: string,
    action: TAction,
    data: TPayload,
    responseHandler?: InboundOcppMessageHandler<TResponse>
  ) {
    super(recipient, id, responseHandler);
    this.type = OcppMessageType.CALL;
    this.action = action;
    this.data = data;
  }
}

export default OcppCallMessage;
export { InboundOcppCall, OutboundOcppCall };
