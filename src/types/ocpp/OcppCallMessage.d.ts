import {
  InboundOcppCallResult,
  OutboundOcppCallResult,
} from './OcppCallResultMessage';
import OcppMessage, {
  OcppMessageType,
  OcppMessagePayload,
  RespondableOcppMessage,
  ResultingOcppMessage,
} from './OcppMessage';

import {
  InboundOcppCallError,
  OutboundOcppCallError,
} from './OcppCallErrorMessage';

declare type OcppCallMessage<TPayload extends OcppMessagePayload> =
  OcppMessage & {
    type: OcppMessageType.CALL;
    get action(): string;
    get data(): TPayload;
  };

declare type InboundOcppCall<
  TPayload extends OcppMessagePayload,
  TResponsePayload extends OcppMessagePayload,
  TResponse extends InboundOcppCallResponse<TResponsePayload>
> = RespondableOcppMessage<TResponse> & OcppCallMessage<TPayload>;

declare type InboundOcppCallResponse<TPayload extends OcppMessagePayload> =
  | OutboundOcppCallResult<TPayload>
  | OutboundOcppCallError;

declare type OutboundOcppCall<
  TPayload extends OcppMessagePayload,
  TResponsePayload extends OcppMessagePayload,
  TResponse extends OutboundOcppCallResponse<TResponsePayload>
> = ResultingOcppMessage<TResponse> & OcppCallMessage<TPayload>;

declare type OutboundOcppCallResponse<TPayload extends OcppMessagePayload> =
  | InboundOcppCallResult<TPayload>
  | InboundOcppCallError;
