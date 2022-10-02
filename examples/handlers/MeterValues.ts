import { OutboundCallResult } from '../../src/common/callresult';
import { InboundMessageHandler } from '../../src/common/handler';
import { MeterValuesRequest } from '../../src/types/ocpp/1.6/messages/MeterValues';

class MeterValuesHandler extends InboundMessageHandler {
  async handle(message: MeterValuesRequest) {
    if (message.action !== 'MeterValues') {
      return await super.handle(message);
    }

    message.respond(new OutboundCallResult(message.sender, message.id, {}));
    return await super.handle(message);
  }
}

export default MeterValuesHandler;
