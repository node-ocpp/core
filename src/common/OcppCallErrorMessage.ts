import OcppClient from './OcppClient';
import OcppSession from './OcppSession';

import OcppMessage, {
  OcppMessageType,
  OcppMessagePayload,
  OcppMessageContext,
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

type OcppCallErrorMessage = OcppMessage & {
  type: OcppMessageType.CALLERROR;
  code: RPCError;
  description: string;
  details: OcppMessagePayload;
};

class InboundOcppCallError<
  TClient extends OcppClient = OcppClient,
  TSession extends OcppSession<TClient> = OcppSession<TClient>,
  TContext extends OcppMessageContext<unknown, TClient, TSession> = null
> extends InboundOcppMessage<TClient, TSession, TContext> {
  type: OcppMessageType.CALLERROR;
  private _code: RPCError;
  private _description: string;
  private _details: OcppMessagePayload;

  constructor(
    id: string,
    sender: TClient,
    code: RPCError = 'GenericError',
    description = '',
    details: OcppMessagePayload = {},
    context?: TContext
  ) {
    super(id, sender, context);
    this._code = code;
    this._description = description;
    this._details = details;
  }

  set code(code: RPCError) {
    this._code = code;
  }

  get code() {
    return this._code;
  }

  set description(description: string) {
    this._description = description;
  }

  get description() {
    return this._description;
  }

  set details(details: OcppMessagePayload) {
    this._details = details;
  }

  get details() {
    return this._details;
  }
}

class OutboundOcppCallError<
  TClient extends OcppClient = OcppClient,
  TSession extends OcppSession<TClient> = OcppSession<TClient>,
  TContext extends OcppMessageContext<unknown, TClient, TSession> = null
> extends OutboundOcppMessage<TClient, TSession, TContext> {
  type: OcppMessageType.CALLERROR;
  private _code: RPCError;
  private _description: string;
  private _details: OcppMessagePayload;

  constructor(
    id: string,
    code: RPCError = 'GenericError',
    description = '',
    details: OcppMessagePayload = {},
    recipient?: TClient,
    context?: TContext
  ) {
    super(id, recipient, context);
    this._code = code;
    this._description = description;
    this._details = details;
  }

  set code(code: RPCError) {
    this._code = code;
  }

  get code() {
    return this._code;
  }

  set description(description: string) {
    this._description = description;
  }

  get description() {
    return this._description;
  }

  set details(details: OcppMessagePayload) {
    this._details = details;
  }

  get details() {
    return this._details;
  }
}

export default OcppCallErrorMessage;
export { InboundOcppCallError, OutboundOcppCallError };
