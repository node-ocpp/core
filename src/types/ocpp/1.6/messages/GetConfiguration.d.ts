import { OutboundCall } from '../../../../common/call';
import { InboundCallResult } from '../../../../common/callresult';

declare type GetConfigurationRequest = OutboundCall<
  'GetConfiguration',
  GetConfigurationRequestPayload,
  GetConfigurationResponsePayload,
  GetConfigurationResponse
>;

declare type GetConfigurationRequestPayload = {
  key?: string;
};

declare type GetConfigurationResponse =
  InboundCallResult<GetConfigurationResponsePayload>;

declare type GetConfigurationResponsePayload = {
  configurationKey?: [KeyValue];
  unknownKey?: [string];
};

declare type KeyValue = {
  key: string;
  readonly: boolean;
  value?: string;
};

export { GetConfigurationRequest, GetConfigurationResponse };
