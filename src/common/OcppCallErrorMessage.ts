import { OcppClient } from './OcppSession';

import {
  OcppMessageType,
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
  type: OcppMessageType.CALLERROR;
  private _code: RPCError;
  private _description: string;
  private _details: OcppMessagePayload;

  constructor(
    id: string,
    sender: OcppClient,
    code: RPCError = 'GenericError',
    description = '',
    details: OcppMessagePayload = {}
  ) {
    super(id, sender);
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

class OutboundOcppCallError extends OutboundOcppMessage {
  type: OcppMessageType.CALLERROR;
  private _code: RPCError;
  private _description: string;
  private _details: OcppMessagePayload;

  constructor(
    id: string,
    code: RPCError = 'GenericError',
    description = '',
    details: OcppMessagePayload = {},
    recipient?: OcppClient
  ) {
    super(id, recipient);
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

export { InboundOcppCallError, OutboundOcppCallError, RPCError };
