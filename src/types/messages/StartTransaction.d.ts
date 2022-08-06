import { InboundOcppCall } from '../../common/OcppCallMessage';
import { OutboundOcppCallResult } from '../../common/OcppCallResultMessage';
import IdToken from '../structs/IdToken';
import IdTagInfo from '../structs/IdTagInfo';

declare type StartTransactionRequest = InboundOcppCall<
  StartTransactionRequestPayload,
  StartTransactionResponsePayload,
  StartTransactionResponse
>;

declare type StartTransactionRequestPayload = {
  connectorId: number;
  idTag: IdToken;
  meterStart: number;
  reservationId?: number;
  timestamp: Date;
};

declare type StartTransactionResponse = OutboundOcppCallResult<StartTransactionResponsePayload>;

declare type StartTransactionResponsePayload = {
  idTagInfo: IdTagInfo;
  transactionId: number;
};

export { StartTransactionRequest, StartTransactionResponse };
