/* eslint-disable no-case-declarations */
import { oneLine } from 'common-tags';

import WebSocketEndpoint from '../src/ws/WebSocketEndpoint';
import OcppMessageType from '../src/types/ocpp/OcppMessageType';
import * as Handlers from './handlers';
import OcppCallErrorMessage from '../src/common/OcppCallErrorMessage';
import OcppCallMessage from '../src/common/OcppCallMessage';
import OcppCallResultMessage from '../src/common/OcppCallResultMessage';
import OcppMessage from '../src/common/OcppMessage';

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

wsEndpoint.on('server_starting', config => {
  console.log('Starting server...');
  console.dir(config);
});

wsEndpoint.on('server_listening', config =>
  console.log(`Server is listening on port ${config.port}`)
);

wsEndpoint.on('server_stopping', () => console.log('Stopping server...'));

wsEndpoint.on('server_stopped', () => console.log('Server stopped'));

wsEndpoint.on('client_connecting', client =>
  console.log(`Client with id ${client.id} attempting authentication`)
);

wsEndpoint.on('client_connected', client =>
  console.log(`Client with id ${client.id} authenticated successfully`)
);

wsEndpoint.on('client_rejected', client =>
  console.log(`Rejected connection from client with id ${client.id}`)
);

wsEndpoint.on('client_disconnected', client =>
  console.log(`Client with id ${client.id} disconnected`)
);

wsEndpoint.on('message_received', message => {
  console.log(
    oneLine`Received ${OcppMessageType[message.type]} message
    with id ${message.id} from client with id ${message.sender.id}`
  );
  logMessage(message);
});

wsEndpoint.on('message_sent', message => {
  console.log(
    oneLine`Sent ${OcppMessageType[message.type]} message with
    id ${message.id} to client with id ${message.recipient.id}`
  );
  logMessage(message);
});

wsEndpoint.listen();

const logMessage = (message: OcppMessage) => {
  switch (message.type) {
    case OcppMessageType.CALL:
    case OcppMessageType.CALLRESULT: {
      const msg = message as OcppCallMessage | OcppCallResultMessage;
      console.dir(msg.data);
      break;
    }

    case OcppMessageType.CALLERROR: {
      const msg = message as OcppCallErrorMessage;
      console.dir(msg.code);
      console.dir(msg.description);
      console.dir(msg.details);
      break;
    }
  }
};

export default wsEndpoint;
