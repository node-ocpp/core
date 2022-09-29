import { OutboundOcppCallResult } from '../../src/common/OcppCallResultMessage';
import { InboundOcppMessageHandler } from '../../src/common/OcppHandlers';
import { MeterValuesRequest } from '../../src/types/ocpp/1.6/messages/MeterValues';

class MeterValuesHandler extends InboundOcppMessageHandler {
  async handle(message: MeterValuesRequest) {
    if (message.action !== 'MeterValues') {
      return await super.handle(message);
    }

    message.respond(new OutboundOcppCallResult(message.sender, message.id, {}));
    return await super.handle(message);
  }
}

export default MeterValuesHandler;
