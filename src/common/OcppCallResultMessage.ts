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

  constructor(id: string, sender: OcppClient, data: TPayload) {
    super(id, sender);
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

  constructor(id: string, recipient: OcppClient, data: TPayload) {
    super(id, recipient);
    this.data = data;
  }
}

export { InboundOcppCallResult, OutboundOcppCallResult };
