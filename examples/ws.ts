import WebSocketEndpoint from '../src/ws/WebSocketEndpoint';
import {
  OcppAuthenticationHandler,
  OcppAuthenticationRequest,
  InboundOcppMessageHandler,
} from '../src/common/OcppHandlers';
import { InboundOcppMessage } from '../src/common/OcppMessage';
import { BootNotificationRequest } from '../src/types/ocpp/1.6/messages/BootNotification';
import { OutboundOcppCallResult } from '../src/common/OcppCallResultMessage';

class SimpleAuthenticationHandler extends OcppAuthenticationHandler {
  async handle(request: OcppAuthenticationRequest) {
    console.log(`Client ${request.client.id} attempting to authenticate
            with password ${request.password}`);

    request.accept();
  }
}

class GenericMessageHandler extends InboundOcppMessageHandler {
  async handle(message: InboundOcppMessage) {
    console.dir(message);
    return await super.handle(message);
  }
}

class BootNotificationHandler extends InboundOcppMessageHandler {
  async handle(message: BootNotificationRequest) {
    if (message.action !== 'BootNotification') {
      return await super.handle(message);
    }

    message.respond(
      new OutboundOcppCallResult(message.sender, message.id, {
        currentTime: new Date(),
        interval: 30,
        status: 'Accepted',
      })
    );
  }
}
const wsEndpoint = new WebSocketEndpoint(
  { port: 8080, hostname: 'localhost', basicAuth: false },
  [new SimpleAuthenticationHandler()],
  [new GenericMessageHandler(), new BootNotificationHandler()]
);

wsEndpoint.on('server_listening', config => {
  console.log(`Server is listening on port ${config.port}`);
  console.dir(config);
});
wsEndpoint.listen();

export default wsEndpoint;
