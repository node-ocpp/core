/* eslint-disable no-case-declarations */

import WebSocketEndpoint from '../src/ws/WebSocketEndpoint';
import * as Handlers from './handlers';

const wsEndpoint = new WebSocketEndpoint(
  { basicAuth: false },
  [new Handlers.AuthenticationHandler()],
  [
    new Handlers.BootNotificationHandler(),
    new Handlers.StatusNotificationHandler(),
    new Handlers.HeartbeatHandler(),
    new Handlers.AuthorizeHandler(),
    new Handlers.StartTransactionHandler(),
    new Handlers.MeterValuesHandler(),
    new Handlers.StopTransactionHandler(),
  ]
);

wsEndpoint.listen();

export default wsEndpoint;
