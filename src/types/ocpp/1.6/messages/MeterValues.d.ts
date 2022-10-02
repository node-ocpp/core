import { InboundCall } from '../../../../common/call';
import { OutboundCallResult } from '../../../../common/callresult';
import MeterValue from '../structs/MeterValue';

declare type MeterValuesRequest = InboundCall<
  'MeterValues',
  MeterValuesRequestPayload,
  {},
  MeterValuesResponse
>;

declare type MeterValuesResponse = OutboundCallResult<{}>;

declare type MeterValuesRequestPayload = {
  connectorId: number;
  transactionId?: number;
  meterValues: MeterValue[];
};

export { MeterValuesRequest, MeterValuesResponse };
