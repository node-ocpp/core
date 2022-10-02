import { OutboundCallResult } from '../../src/common/callresult';
import { InboundMessageHandler } from '../../src/common/handler';
import { StopTransactionRequest } from '../../src/types/ocpp/1.6/messages/StopTransaction';

class StopTransactionHandler extends InboundMessageHandler {
  async handle(message: StopTransactionRequest) {
    if (message.action !== 'StopTransaction') {
      return await super.handle(message);
    }

    message.respond(
      new OutboundCallResult(message.sender, message.id, {
        idTagInfo: { status: 'Accepted' },
      })
    );

    return await super.handle(message);
  }
}

export default StopTransactionHandler;
