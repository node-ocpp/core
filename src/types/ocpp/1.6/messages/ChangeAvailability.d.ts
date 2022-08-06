import { OutboundOcppCall } from '../../../../common/OcppCallMessage';
import { InboundOcppCallResult } from '../../../../common/OcppCallResultMessage';

declare type ChangeAvailabilityRequest = OutboundOcppCall<
  ChangeAvailabilityRequestPayload,
  ChangeAvailabilityResponsePayload,
  ChangeAvailabilityResponse
>;

declare type ChangeAvailabilityRequestPayload = {
  connectorId: number;
  type: AvailabilityType;
};

declare type AvailabilityType = 'Inoperative' | 'Operative';

declare type ChangeAvailabilityResponse = InboundOcppCallResult<ChangeAvailabilityResponsePayload>;

declare type ChangeAvailabilityResponsePayload = {
  status: AvailabilityStatus;
};

declare type AvailabilityStatus = 'Accepted' | 'Rejected';

export { ChangeAvailabilityRequest, ChangeAvailabilityResponse };
