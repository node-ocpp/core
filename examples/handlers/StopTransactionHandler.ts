import { OutboundOcppCallResult } from '../../src/common/OcppCallResultMessage';
import { InboundOcppMessageHandler } from '../../src/common/OcppHandlers';
import { StopTransactionRequest } from '../../src/types/ocpp/1.6/messages/StopTransaction';

class StopTransactionHandler extends InboundOcppMessageHandler {
  async handle(message: StopTransactionRequest) {
    if (message.action !== 'StopTransaction') {
      return await super.handle(message);
    }

    message.respond(
      new OutboundOcppCallResult(message.sender, message.id, {
        idTagInfo: { status: 'Accepted' },
      })
    );

    return await super.handle(message);
  }
}

export default StopTransactionHandler;
