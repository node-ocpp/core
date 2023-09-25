import Call, { InboundCall, OutboundCall } from '../../common/call';
import { InboundCallResult, OutboundCallResult } from '../../common/callresult';

// Infer payload type from Call
type CallPayload<TMessage> = TMessage extends Call<infer TPayload>
  ? TPayload
  : never;

// Infer response type from Call
type CallResponse<TMessage> = TMessage extends OutboundCall<
  any,
  infer TResponse
>
  ? TResponse
  : TMessage extends InboundCall<any, infer TResponse>
  ? TResponse
  : never;

// Infer response payload type from Call
type CallResponsePayload<TMessage> = TMessage extends InboundCall<
  any,
  infer TResponse
>
  ? CallResultPayload<TResponse>
  : TMessage extends OutboundCall<any, infer TResponse>
  ? CallResultPayload<TResponse>
  : never;

// Infer payload type from CallResult
type CallResultPayload<TMessage> = TMessage extends InboundCallResult<
  infer TPayload
>
  ? TPayload
  : TMessage extends OutboundCallResult<infer TPayload>
  ? TPayload
  : never;

export { CallPayload, CallResponse, CallResponsePayload, CallResultPayload };
