/* eslint-disable no-case-declarations */
import WsEndpoint from '../src/ws/ws-endpoint';
import * as Handlers from './handlers';
import { RemoteStartTransactionRequest } from '../src/types/ocpp/1.6/messages/RemoteStartTransaction';
import { BootNotificationRequest } from '../src/types/ocpp/1.6/messages/BootNotification';

const wsEndpoint = new WsEndpoint(
  { basicAuth: false, sessionTimeout: 120000 },
  [new Handlers.BasicAuthHandler()],
  [
    new Handlers.StatusNotificationHandler(),
    new Handlers.HeartbeatHandler(),
    new Handlers.AuthorizeHandler(),
    new Handlers.StartTransactionHandler(),
    new Handlers.MeterValuesHandler(),
    new Handlers.StopTransactionHandler(),
  ]
);

wsEndpoint.handle<BootNotificationRequest>('BootNotification', async data => ({
  currentTime: new Date(),
  status: 'Accepted',
  interval: 120,
}));

wsEndpoint.on('client_connected', async client => {
  const response = await wsEndpoint.send<RemoteStartTransactionRequest>(
    client.id,
    'RemoteStartTransaction',
    {
      idTag: '1234567890',
    }
  );
  console.dir(response);
});

wsEndpoint.listen();

export default wsEndpoint;
