import { OutboundOcppCallResult } from '../../src/common/OcppCallResultMessage';
import { InboundOcppMessageHandler } from '../../src/common/OcppHandlers';
import { StatusNotificationRequest } from '../../src/types/ocpp/1.6/messages/StatusNotification';

class StatusNotificationHandler extends InboundOcppMessageHandler {
  async handle(message: StatusNotificationRequest) {
    if (message.action !== 'StatusNotification') {
      return await super.handle(message);
    }

    message.respond(new OutboundOcppCallResult(message.sender, message.id, {}));
    return await super.handle(message);
  }
}

export default StatusNotificationHandler;
