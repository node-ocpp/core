import { OutboundCall } from '../../../../common/call';
import { InboundCallResult } from '../../../../common/callresult';
import IdToken from '../structs/IdToken';
import ChargingProfile from '../structs/ChargingProfile';
import RemoteStartStopStatus from '../structs/RemoteStartStopStatus';

declare type RemoteStartTransactionRequest = OutboundCall<
  'RemoteStartTransaction',
  RemoteStartTransactionRequestPayload,
  RemoteStartTransactionResponsePayload,
  RemoteStartTransactionResponse
>;

declare type RemoteStartTransactionRequestPayload = {
  connectorId?: number;
  idTag: IdToken;
  chargingProfile?: ChargingProfile;
};

declare type RemoteStartTransactionResponse =
  InboundCallResult<RemoteStartTransactionResponsePayload>;

declare type RemoteStartTransactionResponsePayload = {
  status: RemoteStartStopStatus;
};

export { RemoteStartTransactionRequest, RemoteStartTransactionResponse };
