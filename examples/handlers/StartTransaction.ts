import { OutboundCallResult } from '../../src/common/callresult';
import { InboundMessageHandler } from '../../src/common/handler';
import { StartTransactionRequest } from '../../src/types/ocpp/1.6/messages/StartTransaction';

class StartTransactionHandler extends InboundMessageHandler {
  async handle(message: StartTransactionRequest) {
    if (message.action !== 'StartTransaction') {
      return await super.handle(message);
    }

    message.respond(
      new OutboundCallResult(message.sender, message.id, {
        transactionId: Math.floor(Math.random() * 1048576),
        idTagInfo: { status: 'Accepted' },
      })
    );

    return await super.handle(message);
  }
}

export default StartTransactionHandler;
