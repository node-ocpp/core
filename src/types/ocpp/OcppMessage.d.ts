import OcppClient from '../../common/OcppClient';

declare enum OcppMessageType {
  CALL = 2,
  CALLRESULT = 3,
  CALLERROR = 4,
}

declare type OcppMessageValue =
  | string
  | number
  | boolean
  | Date
  | { [x: string]: OcppMessageValue }
  | Array<OcppMessageValue>;

declare type OcppMessagePayload = OcppMessageValue | null | {};

declare type OcppMessage = {
  type: OcppMessageType;
  get id(): string;
  get raw(): string;
  get timestamp(): Date | null;
};

declare type InboundOcppMessage = OcppMessage & {
  get sender(): OcppClient;
};

declare type OutboundOcppMessage = OcppMessage & {
  get recipient(): OcppClient;
  get state(): OutboundOcppMessageState;
};

declare enum OutboundOcppMessageState {
  Unsent,
  Sent,
}

declare type RespondableOcppMessage<TResponse extends OutboundOcppMessage> = InboundOcppMessage & {
  respond: (response: TResponse) => void;
  get state(): RespondableOcppMessageState;
};

declare enum RespondableOcppMessageState {
  ResponseUnsent,
  ResponseSent,
}

declare type ResultingOcppMessage<TResponse extends InboundOcppMessage> = OutboundOcppMessage & {
  handleResponse: (handler: (response: TResponse) => void) => void;
  get state(): ResultingOcppMessageState;
};

declare enum ResultingOcppMessageState {
  ResponsePending,
  ResponseReceived,
}

export default OcppMessage;
export {
  OcppMessageType,
  OcppMessagePayload,
  InboundOcppMessage,
  OutboundOcppMessage,
  RespondableOcppMessage,
  ResultingOcppMessage,
};
