import { OutboundOcppCall } from '../../common/OcppCallMessage';
import { InboundOcppCallResult } from '../../common/OcppCallResultMessage';
import IdToken from '../structs/IdToken';
import ChargingProfile from '../structs/ChargingProfile';
import RemoteStartStopStatus from '../structs/RemoteStartStopStatus';

declare type RemoteStartTransactionRequest = OutboundOcppCall<
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
  InboundOcppCallResult<RemoteStartTransactionResponsePayload>;

declare type RemoteStartTransactionResponsePayload = {
  status: RemoteStartStopStatus;
};

export { RemoteStartTransactionRequest, RemoteStartTransactionResponse };
