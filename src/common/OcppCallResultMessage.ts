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
  type: OcppMessageType.CALLRESULT;
  private _data: TPayload;

  constructor(id: string, sender: OcppClient, data: TPayload) {
    super(id, sender);
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
  TPayload extends OcppMessagePayload = unknown
> extends OutboundOcppMessage {
  type: OcppMessageType.CALLRESULT;
  private _data: TPayload;

  constructor(id: string, data: TPayload, recipient?: OcppClient) {
    super(id, recipient);
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
