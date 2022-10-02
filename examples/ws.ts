/* eslint-disable no-case-declarations */

import WsEndpoint from '../src/ws/ws-endpoint';
import * as Handlers from './handlers';

const wsEndpoint = new WsEndpoint(
  { basicAuth: false },
  [new Handlers.BasicAuthHandler()],
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
