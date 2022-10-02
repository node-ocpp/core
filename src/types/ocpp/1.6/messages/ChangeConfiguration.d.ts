import { OutboundCall } from '../../../../common/call';
import { InboundCallResult } from '../../../../common/callresult';

declare type ChangeConfigurationRequest = OutboundCall<
  'ChangeConfiguration',
  ChangeConfigurationRequestPayload,
  ChangeConfigurationResponsePayload,
  ChangeConfigurationResponse
>;

declare type ChangeConfigurationRequestPayload = {
  key: string;
  value: string;
};

declare type ChangeConfigurationResponse =
  InboundCallResult<ChangeConfigurationResponsePayload>;

declare type ChangeConfigurationResponsePayload = {
  status: ConfigurationStatus;
};

declare type ConfigurationStatus =
  | 'Accepted'
  | 'Rejected'
  | 'RebootRequired'
  | 'NotSupported';

export { ChangeConfigurationRequest, ChangeConfigurationResponse };
