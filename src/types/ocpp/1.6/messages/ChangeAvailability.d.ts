import { OutboundCall } from '../../../../common/call';
import { InboundCallResult } from '../../../../common/callresult';

declare type ChangeAvailabilityRequest = OutboundCall<
  'ChangeAvailability',
  ChangeAvailabilityRequestPayload,
  ChangeAvailabilityResponsePayload,
  ChangeAvailabilityResponse
>;

declare type ChangeAvailabilityRequestPayload = {
  connectorId: number;
  type: AvailabilityType;
};

declare type AvailabilityType = 'Inoperative' | 'Operative';

declare type ChangeAvailabilityResponse =
  InboundCallResult<ChangeAvailabilityResponsePayload>;

declare type ChangeAvailabilityResponsePayload = {
  status: AvailabilityStatus;
};

declare type AvailabilityStatus = 'Accepted' | 'Rejected';

export { ChangeAvailabilityRequest, ChangeAvailabilityResponse };
