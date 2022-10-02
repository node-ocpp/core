import { InboundCall } from '../../../../common/call';
import { OutboundCallResult } from '../../../../common/callresult';
import IdToken from '../structs/IdToken';
import MeterValue from '../structs/MeterValue';
import IdTagInfo from '../structs/IdTagInfo';

declare type StopTransactionRequest = InboundCall<
  'StopTransaction',
  StopTransactionRequestPayload,
  StopTransactionResponsePayload,
  StopTransactionResponse
>;

declare type StopTransactionRequestPayload = {
  idTag?: IdToken;
  meterStop: number;
  timestamp: Date;
  transactionId: number;
  reason?: Reason;
  transactionData?: MeterValue[];
};

declare type Reason =
  | 'EmergencyStop'
  | 'EVDisconnected'
  | 'HardReset'
  | 'Local'
  | 'Charge'
  | 'Other'
  | 'PowerLoss'
  | 'Reboot'
  | 'Value'
  | 'Remote'
  | 'SoftReset'
  | 'UnlockCommand'
  | 'DeAuthorized';

declare type StopTransactionResponse =
  OutboundCallResult<StopTransactionResponsePayload>;

declare type StopTransactionResponsePayload = {
  idTagInfo: IdTagInfo;
};

export { StopTransactionRequest, StopTransactionResponse };
