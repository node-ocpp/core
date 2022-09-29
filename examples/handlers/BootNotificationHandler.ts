import { OutboundOcppCallResult } from '../../src/common/OcppCallResultMessage';
import { InboundOcppMessageHandler } from '../../src/common/OcppHandlers';
import { BootNotificationRequest } from '../../src/types/ocpp/1.6/messages/BootNotification';

class BootNotificationHandler extends InboundOcppMessageHandler {
  async handle(message: BootNotificationRequest) {
    if (message.action !== 'BootNotification') {
      return await super.handle(message);
    }

    message.respond(
      new OutboundOcppCallResult(message.sender, message.id, {
        currentTime: new Date(),
        interval: 120,
        status: 'Accepted',
      })
    );

    return await super.handle(message);
  }
}

export default BootNotificationHandler;
