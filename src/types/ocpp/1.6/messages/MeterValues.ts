import { InboundCall } from '../../../../common/call';
import { OutboundCallResult } from '../../../../common/callresult';
import MeterValue from '../structs/MeterValue';

declare type MeterValuesRequest = InboundCall<
  MeterValuesRequestPayload,
  MeterValuesResponse
>;

declare type MeterValuesResponse = OutboundCallResult<{}>;

declare type MeterValuesRequestPayload = {
  connectorId: number;
  transactionId?: number;
  meterValue: MeterValue[];
};

export { MeterValuesRequest, MeterValuesResponse };
