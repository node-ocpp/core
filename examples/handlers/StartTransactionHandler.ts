import { OutboundOcppCallResult } from '../../src/common/OcppCallResultMessage';
import { InboundOcppMessageHandler } from '../../src/common/OcppHandlers';
import { StartTransactionRequest } from '../../src/types/ocpp/1.6/messages/StartTransaction';

class StartTransactionHandler extends InboundOcppMessageHandler {
  async handle(message: StartTransactionRequest) {
    if (message.action !== 'StartTransaction') {
      return await super.handle(message);
    }

    message.respond(
      new OutboundOcppCallResult(message.sender, message.id, {
        transactionId: Math.floor(Math.random() * 1048576),
        idTagInfo: { status: 'Accepted' },
      })
    );

    return await super.handle(message);
  }
}

export default StartTransactionHandler;
