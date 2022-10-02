import { OutboundCallResult } from '../../src/common/callresult';
import { InboundMessageHandler } from '../../src/common/handler';
import { StatusNotificationRequest } from '../../src/types/ocpp/1.6/messages/StatusNotification';

class StatusNotificationHandler extends InboundMessageHandler {
  async handle(message: StatusNotificationRequest) {
    if (message.action !== 'StatusNotification') {
      return await super.handle(message);
    }

    message.respond(new OutboundCallResult(message.sender, message.id, {}));
    return await super.handle(message);
  }
}

export default StatusNotificationHandler;
