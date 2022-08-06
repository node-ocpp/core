import { OutboundOcppCall } from '../../common/OcppCallMessage';
import { InboundOcppCallResult } from '../../common/OcppCallResultMessage';
import RemoteStartStopStatus from '../structs/RemoteStartStopStatus';

declare type RemoteStopTransactionRequest = OutboundOcppCall<
  RemoteStopTransactionRequestPayload,
  RemoteStopTransactionResponsePayload,
  RemoteStopTransationResponse
>;

declare type RemoteStopTransactionRequestPayload = {
  transactionId: number;
};

declare type RemoteStopTransationResponse =
  InboundOcppCallResult<RemoteStopTransactionResponsePayload>;

declare type RemoteStopTransactionResponsePayload = {
  status: RemoteStartStopStatus;
};

export { RemoteStopTransactionRequest, RemoteStopTransationResponse };
