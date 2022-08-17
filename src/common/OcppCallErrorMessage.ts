import { OcppClient } from './OcppSession';
import OcppMessageType from '../types/ocpp/OcppMessageType';
import {
  OcppMessagePayload,
  InboundOcppMessage,
  OutboundOcppMessage,
} from './OcppMessage';

type RPCError =
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

class InboundOcppCallError extends InboundOcppMessage {
  readonly type: OcppMessageType.CALLERROR;
  code: RPCError;
  description: string;
  details: OcppMessagePayload;

  constructor(
    id: string,
    sender: OcppClient,
    code: RPCError = 'GenericError',
    description = '',
    details: OcppMessagePayload = {}
  ) {
    super(id, sender);
    this.code = code;
    this.description = description;
    this.details = details;
  }
}

class OutboundOcppCallError extends OutboundOcppMessage {
  readonly type: OcppMessageType.CALLERROR;
  code: RPCError;
  description: string;
  details: OcppMessagePayload;

  constructor(
    id: string,
    code: RPCError = 'GenericError',
    description = '',
    details: OcppMessagePayload = {},
    recipient?: OcppClient
  ) {
    super(id, recipient);
    this.code = code;
    this.description = description;
    this.details = details;
  }
}

export { InboundOcppCallError, OutboundOcppCallError, RPCError };
