import { OutboundOcppCall } from '../../../../common/OcppCallMessage';
import { InboundOcppCallResult } from '../../../../common/OcppCallResultMessage';

declare type ResetRequest = OutboundOcppCall<
  ResetRequestPayload,
  ResetResponsePayload,
  ResetResponse
>;

declare type ResetRequestPayload = {
  type: ResetType;
};

declare type ResetType = 'Hard' | 'Soft';

declare type ResetResponse = InboundOcppCallResult<ResetResponsePayload>;

declare type ResetResponsePayload = {
  status: ResetStatus;
};

declare type ResetStatus = 'Accepted' | 'Rejected';

export { ResetRequest, ResetResponse };
