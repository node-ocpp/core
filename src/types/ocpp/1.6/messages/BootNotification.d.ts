import { InboundCall } from '../../../../common/call';
import { OutboundCallResult } from '../../../../common/callresult';

declare type BootNotificationRequest = InboundCall<
  'BootNotification',
  BootNotificationRequestPayload,
  BootNotificationResponsePayload,
  BootNotificationResponse
>;

declare type BootNotificationRequestPayload = {
  chargeBoxSerialNumber?: string;
  chargePointModel: string;
  chargePointSerialNumber?: string;
  chargePointVendor: string;
  firmwareVersion?: string;
  iccid?: string;
  imsi?: string;
  meterSerialNumber?: string;
  meterType?: string;
};

declare type BootNotificationResponse =
  OutboundCallResult<BootNotificationResponsePayload>;

declare type BootNotificationResponsePayload = {
  currentTime: Date;
  interval: number;
  status: RegistrationStatus;
};

declare type RegistrationStatus = 'Accepted' | 'Pending' | 'Rejected';

export { BootNotificationRequest, BootNotificationResponse };
