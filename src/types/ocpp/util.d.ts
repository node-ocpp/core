import Call from '../../common/call';
import CallResult from '../../common/callresult';
import { Payload } from '../../common/message';
import OcppAction from './action';

// Infer action type from Call
type CallAction<TMessage> = TMessage extends Call<infer TAction>
  ? TAction
  : never;

// Infer payload type from Call
type CallPayload<TMessage> = TMessage extends Call<OcppAction, infer TPayload>
  ? TPayload
  : never;

// Infer response type from Call
type CallResponse<TMessage> = TMessage extends Call<
  OcppAction,
  Payload,
  Payload,
  infer TResponse
>
  ? TResponse
  : never;

// Infer response payload type from Call
type CallResponsePayload<TMessage> = TMessage extends Call<
  OcppAction,
  Payload,
  infer TResponsePayload
>
  ? TResponsePayload
  : never;

type CallResultPayload<TMessage> = TMessage extends CallResult<infer TPayload>
  ? TPayload
  : never;

export {
  CallAction,
  CallPayload,
  CallResponse,
  CallResponsePayload,
  CallResultPayload,
};
