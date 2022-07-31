import OcppClient from '../../common/OcppClient';

declare enum OcppMessageType {
  CALL = 2,
  CALLRESULT = 3,
  CALLERROR = 4,
}

declare type OcppMessageId = string;
declare type OcppMessageAction = string;

declare type JSONValue =
  | string
  | number
  | boolean
  | Date
  | { [x: string]: JSONValue }
  | Array<JSONValue>;

declare type OcppMessagePayload = Record<string, JSONValue> | null;

declare type OcppMessage = {
  type: OcppMessageType;
  get id(): OcppMessageId;
};

declare type InboundOcppMessage = OcppMessage & {
  get recipient(): OcppClient;
  set recipient(recipient: OcppClient);
};

declare type OutboundOcppMessage = OcppMessage & {
  get sender(): OcppClient;
  get state(): OutboundOcppMessageState;
};

declare enum OutboundOcppMessageState {
  Unsent,
  Sent,
}

declare type RespondableOcppMessage<TResponse extends OutboundOcppMessage> =
  InboundOcppMessage & {
    respond: (response: TResponse) => void;
    get state(): RespondableOcppMessageState;
  };

declare enum RespondableOcppMessageState {
  ResponseUnsent,
  ResponseSent,
}

declare type ResultingOcppMessage<TResponse extends InboundOcppMessage> =
  OutboundOcppMessage & {
    handleResponse: (handler: (response: TResponse) => void) => void;
    get state(): ResultingOcppMessageState;
  };

declare enum ResultingOcppMessageState {
  ResponsePending,
  ResponseReceived,
}

declare type OcppCallMessage<
  TAction extends OcppMessageAction,
  TPayload extends OcppMessagePayload
> = OcppMessage & {
  type: OcppMessageType.CALL;
  get action(): TAction;
  get data(): TPayload;
};

declare type OcppCallResultMessage<TPayload extends OcppMessagePayload> =
  OcppMessage & {
    type: OcppMessageType.CALLRESULT;
    get data(): TPayload;
  };

declare type RPCError =
  | 'FormatViolation'
  | 'GenericError'
  | 'InternalError'
  | 'MessageTypeNotSupported'
  | 'NotImplemented'
  | 'NotSupported'
  | 'OccurrenceConstraintViolation'
  | 'PropertyConstraintViolation'
  | 'ProtocolError'
  | 'RpcFrameworkError'
  | 'SecurityError'
  | 'TypeConstraintViolation';

declare type OcppCallErrorMessage = OcppMessage & {
  type: OcppMessageType.CALLERROR;
  code: RPCError;
  description: string;
  details: Record<string, JSONValue>;
};

declare type InboundOcppCallResponse<TPayload extends OcppMessagePayload> =
  | OutboundOcppCallResult<TPayload>
  | OutboundOcppCallError;

declare type InboundOcppCall<
  TAction extends OcppMessageAction,
  TPayload extends OcppMessagePayload,
  TResponsePayload extends OcppMessagePayload,
  TResponse extends InboundOcppCallResponse<TResponsePayload>
> = RespondableOcppMessage<TResponse> & OcppCallMessage<TAction, TPayload>;

declare type InboundOcppCallResult<TPayload extends OcppMessagePayload> =
  InboundOcppMessage & OcppCallResultMessage<TPayload>;

declare type InboundOcppCallError = InboundOcppMessage & OcppCallErrorMessage;

declare type OutboundOcppCall<
  TAction extends OcppMessageAction,
  TPayload extends OcppMessagePayload,
  TResponsePayload extends OcppMessagePayload,
  TResponse extends OutboundOcppCallResponse<TResponsePayload>
> = ResultingOcppMessage<TResponse> & OcppCallMessage<TAction, TPayload>;

declare type OutboundOcppCallResponse<TPayload extends OcppMessagePayload> =
  | InboundOcppCallResult<TPayload>
  | InboundOcppCallError;

declare type OutboundOcppCallResult<TPayload extends OcppMessagePayload> =
  OutboundOcppMessage & OcppCallResultMessage<TPayload>;

declare type OutboundOcppCallError = OutboundOcppMessage & OcppCallErrorMessage;

export default OcppMessage;
export {
  OcppMessageType,
  OcppMessagePayload,
  InboundOcppCall,
  InboundOcppCallResult,
  InboundOcppCallError,
  OutboundOcppCall,
  OutboundOcppCallResult,
  OutboundOcppCallError,
};
