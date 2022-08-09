import { OcppClient } from './OcppSession';
import {
  OcppMessageType,
  OcppMessagePayload,
  InboundOcppMessage,
  OutboundOcppMessage,
} from './OcppMessage';

class InboundOcppCallResult<
  TPayload extends OcppMessagePayload = unknown
> extends InboundOcppMessage {
  readonly type: OcppMessageType.CALLRESULT;
  data: TPayload;

  constructor(id: string, sender: OcppClient, data: TPayload) {
    super(id, sender);
    this.data = data;
  }
}

class OutboundOcppCallResult<
  TPayload extends OcppMessagePayload = unknown
> extends OutboundOcppMessage {
  readonly type: OcppMessageType.CALLRESULT;
  data: TPayload;

  constructor(id: string, data: TPayload, recipient?: OcppClient) {
    super(id, recipient);
    this.data = data;
  }
}

export { InboundOcppCallResult, OutboundOcppCallResult };
