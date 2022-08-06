import { InboundOcppCall } from '../../common/OcppCallMessage';
import { OutboundOcppCallResult } from '../../common/OcppCallResultMessage';

declare type AuthorizeRequest = InboundOcppCall<
  AuthorizeRequestPayload,
  AuthorizeResponsePayload,
  AuthorizeResponse
>;

declare type AuthorizeRequestPayload = {
  idTag: string;
};

declare type AuthorizeResponse = OutboundOcppCallResult<AuthorizeResponsePayload>;

declare type AuthorizeResponsePayload = {
  idTagInfo: IdTagInfo;
};

declare type IdTagInfo = {
  expiryDate?: Date;
  parentIdTag?: IdToken;
  status: AuthorizationStatus;
};

declare type IdToken = {
  IdToken: string;
};

declare type AuthorizationStatus = 'Accepted' | 'Blocked' | 'Expired' | 'Invalid' | 'ConcurrentTx';

export { AuthorizeRequest, AuthorizeResponse };
