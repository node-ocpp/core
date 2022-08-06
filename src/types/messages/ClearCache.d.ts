import { OutboundOcppCall } from '../../common/OcppCallMessage';
import { InboundOcppCallResult } from '../../common/OcppCallResultMessage';

declare type ClearCacheRequest = OutboundOcppCall<
  null,
  ClearCacheResponsePayload,
  ClearCacheResponse
>;

declare type ClearCacheResponse = InboundOcppCallResult<ClearCacheResponsePayload>;

declare type ClearCacheResponsePayload = {
  status: ClearCacheStatus;
};

declare type ClearCacheStatus = 'Accepted' | 'Rejected';

export { ClearCacheRequest, ClearCacheResponse };
