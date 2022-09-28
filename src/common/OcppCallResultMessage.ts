import { OcppClient } from './OcppSession';
import OcppMessageType from '../types/ocpp/OcppMessageType';
import OcppAction from '../types/ocpp/OcppAction';
import OcppMessage, {
  OcppMessagePayload,
  InboundOcppMessage,
  OutboundOcppMessage,
} from './OcppMessage';

interface OcppCallResultMessage<TPayload extends OcppMessagePayload>
  extends OcppMessage {
  readonly type: OcppMessageType.CALLRESULT;
  data: TPayload;
}

class InboundOcppCallResult<TPayload extends OcppMessagePayload = unknown>
  extends InboundOcppMessage
  implements OcppCallResultMessage<TPayload>
{
  readonly type: OcppMessageType.CALLRESULT;
  action: OcppAction;
  data: TPayload;

  constructor(sender: OcppClient, id: string, data: TPayload) {
    super(sender, id);
    this.data = data;
  }
}

class OutboundOcppCallResult<TPayload extends OcppMessagePayload = unknown>
  extends OutboundOcppMessage
  implements OcppCallResultMessage<TPayload>
{
  readonly type: OcppMessageType.CALLRESULT;
  action: OcppAction;
  data: TPayload;

  constructor(recipient: OcppClient, id: string, data: TPayload) {
    super(recipient, id);
    this.data = data;
  }
}

export { InboundOcppCallResult, OutboundOcppCallResult };
