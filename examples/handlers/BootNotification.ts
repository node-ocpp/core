import { OutboundCallResult } from '../../src/common/callresult';
import { InboundMessageHandler } from '../../src/common/handler';
import { BootNotificationRequest } from '../../src/types/ocpp/1.6/messages/BootNotification';

class BootNotificationHandler extends InboundMessageHandler {
  async handle(message: BootNotificationRequest) {
    if (message.action !== 'BootNotification') {
      return await super.handle(message);
    }

    message.respond(
      new OutboundCallResult(message.sender, message.id, {
        currentTime: new Date(),
        interval: 120,
        status: 'Accepted',
      })
    );

    return await super.handle(message);
  }
}

export default BootNotificationHandler;
