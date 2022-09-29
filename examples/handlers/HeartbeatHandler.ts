import { OutboundOcppCallResult } from '../../src/common/OcppCallResultMessage';
import { InboundOcppMessageHandler } from '../../src/common/OcppHandlers';
import { HeartbeatRequest } from '../../src/types/ocpp/1.6/messages/Heartbeat';

class HeartbeatHandler extends InboundOcppMessageHandler {
  async handle(message: HeartbeatRequest) {
    if (message.action !== 'Heartbeat') {
      return await super.handle(message);
    }

    message.respond(
      new OutboundOcppCallResult(message.sender, message.id, {
        currentTime: new Date(),
      })
    );

    return await super.handle(message);
  }
}

export default HeartbeatHandler;
