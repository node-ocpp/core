import OcppMessage, {
  OcppMessageType,
  OcppMessagePayload,
  InboundOcppMessage,
  OutboundOcppMessage,
} from './OcppMessage';

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
  details: OcppMessagePayload;
};

declare type InboundOcppCallError = InboundOcppMessage & OcppCallErrorMessage;

declare type OutboundOcppCallError = OutboundOcppMessage & OcppCallErrorMessage;

export default OcppCallErrorMessage;
export { InboundOcppCallError, OutboundOcppCallError };
