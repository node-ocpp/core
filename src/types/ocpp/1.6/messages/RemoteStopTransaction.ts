import { OutboundCall } from '../../../../common/call';
import { InboundCallResult } from '../../../../common/callresult';
import RemoteStartStopStatus from '../structs/RemoteStartStopStatus';

declare type RemoteStopTransactionRequest = OutboundCall<
  RemoteStopTransactionRequestPayload,
  RemoteStopTransationResponse
>;

declare type RemoteStopTransactionRequestPayload = {
  transactionId: number;
};

declare type RemoteStopTransationResponse =
  InboundCallResult<RemoteStopTransactionResponsePayload>;

declare type RemoteStopTransactionResponsePayload = {
  status: RemoteStartStopStatus;
};

export { RemoteStopTransactionRequest, RemoteStopTransationResponse };
