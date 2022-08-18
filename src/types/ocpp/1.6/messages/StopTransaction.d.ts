import { InboundOcppCall } from '../../../../common/OcppCallMessage';
import { OutboundOcppCallResult } from '../../../../common/OcppCallResultMessage';
import IdToken from '../structs/IdToken';
import MeterValue from '../structs/MeterValue';
import IdTagInfo from '../structs/IdTagInfo';

declare type StopTransactionRequest = InboundOcppCall<
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
  OutboundOcppCallResult<StopTransactionResponsePayload>;

declare type StopTransactionResponsePayload = {
  idTagInfo: IdTagInfo;
};

export { StopTransactionRequest, StopTransactionResponse };
