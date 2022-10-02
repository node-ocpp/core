import { OutboundCallResult } from '../../src/common/callresult';
import { InboundMessageHandler } from '../../src/common/handler';
import { AuthorizeRequest } from '../../src/types/ocpp/1.6/messages/Authorize';

class HeartbeatHandler extends InboundMessageHandler {
  async handle(message: AuthorizeRequest) {
    if (message.action !== 'Authorize') {
      return await super.handle(message);
    }

    message.respond(
      new OutboundCallResult(message.sender, message.id, {
        idTagInfo: {
          status: 'Accepted',
        },
      })
    );

    return await super.handle(message);
  }
}

export default HeartbeatHandler;
