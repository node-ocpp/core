import { InboundCall } from '../../../../common/call';
import { OutboundCallResult } from '../../../../common/callresult';

declare type StatusNotificationRequest = InboundCall<
  'StatusNotification',
  StatusNofificationRequestPayload,
  {},
  StatusNotificationResponse
>;

declare type StatusNotificationResponse = OutboundCallResult<{}>;

declare type StatusNofificationRequestPayload = {
  connectorId: number;
  errorCode: ChargePointErrorCode;
  info?: string;
  status: ChargePointStatus;
  timestamp?: Date;
  vendorId: string;
  vendorErrorCode: string;
};

declare type ChargePointErrorCode = '';

declare type ChargePointStatus = '';

export { StatusNotificationRequest, StatusNotificationResponse };
