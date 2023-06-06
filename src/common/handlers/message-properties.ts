import { InboundMessageHandler } from '../handler';
import { Payload } from '../message';
import { InboundCallResult } from '../callresult';

type IdHandlerCallback = (request: Payload) => Promise<void>;

class IdHandler extends InboundMessageHandler {
  private id: string;
  private handler: IdHandlerCallback;

  constructor(id: string, handler: IdHandlerCallback) {
    super();
    this.id = id;
    this.handler = handler;
  }

  async handle(message: InboundCallResult) {
    if (this.id !== message.id) {
      return await super.handle(message);
    }

    await this.handler(message.data);
  }
}

export { IdHandler, IdHandlerCallback };
