import OcppMessage, {
  OcppMessageType,
  OcppMessagePayload,
  InboundOcppMessage,
  OutboundOcppMessage,
} from './OcppMessage';

declare type OcppCallResultMessage<TPayload extends OcppMessagePayload> = OcppMessage & {
  type: OcppMessageType.CALLRESULT;
  get data(): TPayload;
};

declare type InboundOcppCallResult<TPayload extends OcppMessagePayload> = InboundOcppMessage &
  OcppCallResultMessage<TPayload>;

declare type OutboundOcppCallResult<TPayload extends OcppMessagePayload> = OutboundOcppMessage &
  OcppCallResultMessage<TPayload>;

export default OcppCallResultMessage;
export { InboundOcppCallResult, OutboundOcppCallResult };
