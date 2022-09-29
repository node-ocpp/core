import { InboundOcppCall } from '../../../../common/OcppCallMessage';
import { OutboundOcppCallResult } from '../../../../common/OcppCallResultMessage';
import MeterValue from '../structs/MeterValue';

declare type MeterValuesRequest = InboundOcppCall<
  'MeterValues',
  MeterValuesRequestPayload,
  {},
  MeterValuesResponse
>;

declare type MeterValuesResponse = OutboundOcppCallResult<{}>;

declare type MeterValuesRequestPayload = {
  connectorId: number;
  transactionId?: number;
  meterValues: MeterValue[];
};

export { MeterValuesRequest, MeterValuesResponse };
