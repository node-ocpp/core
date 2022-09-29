import { OcppClient } from './OcppSession';
import OcppMessageType from '../types/ocpp/OcppMessageType';
import OcppAction from '../types/ocpp/OcppAction';
import OcppMessage, {
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

interface OcppCallErrorMessage extends OcppMessage {
  readonly type: OcppMessageType.CALLERROR;
  code: RPCError;
  description: string;
  details: OcppMessagePayload;
}

class InboundOcppCallError
  extends InboundOcppMessage
  implements OcppCallErrorMessage
{
  readonly type: OcppMessageType.CALLERROR;
  code: RPCError;
  description: string;
  details: OcppMessagePayload;

  constructor(
    sender: OcppClient,
    id: string,
    code: RPCError = 'GenericError',
    description = '',
    details: OcppMessagePayload = {}
  ) {
    super(sender, id);
    this.type = OcppMessageType.CALLERROR;
    this.code = code;
    this.description = description;
    this.details = details;
  }
}

class OutboundOcppCallError
  extends OutboundOcppMessage
  implements OcppCallErrorMessage
{
  readonly type: OcppMessageType.CALLERROR;
  code: RPCError;
  description: string;
  details: OcppMessagePayload;

  constructor(
    recipient: OcppClient,
    id: string,
    code: RPCError = 'GenericError',
    description = '',
    details: OcppMessagePayload = {}
  ) {
    super(recipient, id);
    this.type = OcppMessageType.CALLERROR;
    this.code = code;
    this.description = description;
    this.details = details;
  }
}

export { InboundOcppCallError, OutboundOcppCallError, RPCError };
