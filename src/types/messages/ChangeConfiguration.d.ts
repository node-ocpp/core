import { OutboundOcppCall } from '../../common/OcppCallMessage';
import { InboundOcppCallResult } from '../../common/OcppCallResultMessage';

declare type ChangeConfigurationRequest = OutboundOcppCall<
  ChangeConfigurationRequestPayload,
  ChangeConfigurationResponsePayload,
  ChangeConfigurationResponse
>;

declare type ChangeConfigurationRequestPayload = {
  key: string;
  value: string;
};

declare type ChangeConfigurationResponse =
  InboundOcppCallResult<ChangeConfigurationResponsePayload>;

declare type ChangeConfigurationResponsePayload = {
  status: ConfigurationStatus;
};

declare type ConfigurationStatus = 'Accepted' | 'Rejected' | 'RebootRequired' | 'NotSupported';

export { ChangeConfigurationRequest, ChangeConfigurationResponse };
