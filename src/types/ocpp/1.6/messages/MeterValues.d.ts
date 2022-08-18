import { InboundOcppCall } from '../../../../common/OcppCallMessage';
import { OutboundOcppCallResult } from '../../../../common/OcppCallResultMessage';
import MeterValue from '../structs/MeterValue';

declare type MeterValuesRequest = InboundOcppCall<
  'MeterValues',
  MeterValuesRequestPayload,
  null,
  MeterValuesResponse
>;

declare type MeterValuesResponse = OutboundOcppCallResult<null>;

declare type MeterValuesRequestPayload = {
  connectorId: number;
  transactionId?: number;
  meterValues: MeterValue[];
};

export { MeterValuesRequest, MeterValuesResponse };
