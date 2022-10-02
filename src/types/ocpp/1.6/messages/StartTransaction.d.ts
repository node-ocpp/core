import { InboundCall } from '../../../../common/call';
import { OutboundCallResult } from '../../../../common/callresult';
import IdToken from '../structs/IdToken';
import IdTagInfo from '../structs/IdTagInfo';

declare type StartTransactionRequest = InboundCall<
  'StartTransaction',
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

declare type StartTransactionResponse =
  OutboundCallResult<StartTransactionResponsePayload>;

declare type StartTransactionResponsePayload = {
  idTagInfo: IdTagInfo;
  transactionId: number;
};

export { StartTransactionRequest, StartTransactionResponse };
