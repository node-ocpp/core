import { OutboundCall } from '../../../../common/call';
import { InboundCallResult } from '../../../../common/callresult';

declare type UnlockConnectorRequest = OutboundCall<
  'UnlockConnector',
  UnlockConnectorRequestPayload,
  UnlockConnectorResponsePayload,
  UnlockConnectorResponse
>;

declare type UnlockConnectorRequestPayload = {
  connectorId: number;
};

declare type UnlockConnectorResponse =
  InboundCallResult<UnlockConnectorResponsePayload>;

declare type UnlockConnectorResponsePayload = {
  status: UnlockStatus;
};

declare type UnlockStatus = 'Unlocked' | 'UnlockFailed' | 'NotSupported';

export { UnlockConnectorRequest, UnlockConnectorResponse };
