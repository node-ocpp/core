import { OutboundCallResult } from '../../src/common/callresult';
import { InboundMessageHandler } from '../../src/common/handler';
import { HeartbeatRequest } from '../../src/types/ocpp/1.6/messages/Heartbeat';

class HeartbeatHandler extends InboundMessageHandler {
  async handle(message: HeartbeatRequest) {
    if (message.action !== 'Heartbeat') {
      return await super.handle(message);
    }

    message.respond(
      new OutboundCallResult(message.sender, message.id, {
        currentTime: new Date(),
      })
    );

    return await super.handle(message);
  }
}

export default HeartbeatHandler;
