import { Client } from './session';
import MessageType from '../types/ocpp/type';
import OcppAction from '../types/ocpp/action';
import OcppMessage, {
  Payload,
  InboundMessage,
  OutboundMessage,
} from './message';

interface CallResult<TPayload extends Payload = Payload> extends OcppMessage {
  readonly type: MessageType.CALLRESULT;
  data: TPayload;
}

class InboundCallResult<TPayload extends Payload = Payload>
  extends InboundMessage
  implements CallResult<TPayload>
{
  readonly type: MessageType.CALLRESULT;
  action: OcppAction;
  data: TPayload;

  constructor(sender: Client, id: string, data: TPayload) {
    super(sender, id);
    this.type = MessageType.CALLRESULT;
    this.data = data;
  }
}

class OutboundCallResult<TPayload extends Payload = Payload>
  extends OutboundMessage
  implements CallResult<TPayload>
{
  readonly type: MessageType.CALLRESULT;
  action: OcppAction;
  data: TPayload;

  constructor(recipient: Client, id: string, data: TPayload) {
    super(recipient, id);
    this.type = MessageType.CALLRESULT;
    this.data = data;
  }
}

export default CallResult;
export { InboundCallResult, OutboundCallResult };
