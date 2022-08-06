import { InboundOcppCall } from '../../../../common/OcppCallMessage';
import { OutboundOcppCallResult } from '../../../../common/OcppCallResultMessage';

declare type HeartbeatRequest = InboundOcppCall<null, HeartbeatResponsePayload, HeartbeatResponse>;

declare type HeartbeatResponse = OutboundOcppCallResult<HeartbeatResponsePayload>;

declare type HeartbeatResponsePayload = {
  currentTime: Date;
};

export { HeartbeatRequest, HeartbeatResponse };
