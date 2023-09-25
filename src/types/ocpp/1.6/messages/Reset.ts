import { OutboundCall } from '../../../../common/call';
import { InboundCallResult } from '../../../../common/callresult';

declare type ResetRequest = OutboundCall<ResetRequestPayload, ResetResponse>;

declare type ResetRequestPayload = {
  type: ResetType;
};

declare type ResetType = 'Hard' | 'Soft';

declare type ResetResponse = InboundCallResult<ResetResponsePayload>;

declare type ResetResponsePayload = {
  status: ResetStatus;
};

declare type ResetStatus = 'Accepted' | 'Rejected';

export { ResetRequest, ResetResponse };
