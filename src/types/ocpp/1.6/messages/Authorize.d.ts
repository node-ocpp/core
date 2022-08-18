import { InboundOcppCall } from '../../../../common/OcppCallMessage';
import { OutboundOcppCallResult } from '../../../../common/OcppCallResultMessage';
import IdToken from '../structs/IdToken';
import IdTagInfo from '../structs/IdTagInfo';

declare type AuthorizeRequest = InboundOcppCall<
  'Authorize',
  AuthorizeRequestPayload,
  AuthorizeResponsePayload,
  AuthorizeResponse
>;

declare type AuthorizeRequestPayload = {
  idTag: string;
};

declare type AuthorizeResponse =
  OutboundOcppCallResult<AuthorizeResponsePayload>;

declare type AuthorizeResponsePayload = {
  idTagInfo: IdTagInfo;
};

export { AuthorizeRequest, AuthorizeResponse };
