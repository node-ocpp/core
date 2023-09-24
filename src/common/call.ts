import { Client } from './session';
import MessageType from '../types/ocpp/type';
import OcppAction from '../types/ocpp/action';
import OcppMessage, {
  Payload,
  RespondableMessage,
  ResultingMessage,
} from './message';
import CallResult, {
  InboundCallResult,
  OutboundCallResult,
} from './callresult';
import { InboundMessageHandler, ResponseHandler } from './handler';

interface Call<
  TPayload extends Payload,
  TResponse extends CallResult = CallResult,
> extends OcppMessage {
  readonly type: MessageType.CALL;
  action: OcppAction;
  data: TPayload;
}

class InboundCall<
    TPayload = Payload,
    TResponse extends OutboundCallResult = OutboundCallResult,
  >
  extends RespondableMessage<TResponse>
  implements Call<TPayload, TResponse>
{
  type: MessageType.CALL;
  action: OcppAction;
  data: TPayload;

  constructor(
    sender: Client,
    id: string,
    action: OcppAction,
    data: TPayload,
    responseHandler?: ResponseHandler<TResponse>
  ) {
    super(sender, id, responseHandler);
    this.type = MessageType.CALL;
    this.action = action;
    this.data = data;
  }
}

class OutboundCall<
    TPayload = Payload,
    TResponse extends InboundCallResult = InboundCallResult,
  >
  extends ResultingMessage<TResponse>
  implements Call<TPayload, TResponse>
{
  type: MessageType.CALL;
  action: OcppAction;
  data: TPayload;

  constructor(
    recipient: Client,
    id: string,
    action: OcppAction,
    data: TPayload,
    responseHandler?: InboundMessageHandler<TResponse>
  ) {
    super(recipient, id, responseHandler);
    this.type = MessageType.CALL;
    this.action = action;
    this.data = data;
  }
}

export default Call;
export { InboundCall, OutboundCall };
