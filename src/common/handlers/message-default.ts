import { Logger } from 'ts-log';
import { OutboundCallError } from '../callerror';

import { InboundMessageHandler } from '../handler';
import { InboundMessage } from '../message';

class DefaultMessageHandler extends InboundMessageHandler {
  private logger: Logger;

  constructor(logger: Logger) {
    super();
    this.logger = logger;
  }

  async handle(message: InboundMessage) {
    this.logger.warn(
      `Client with id ${message.sender.id} sent valid but unsupported message`
    );

    throw new OutboundCallError(
      message.sender,
      message.id,
      'NotSupported',
      'Message is valid but currently not supported'
    );
  }
}

export default DefaultMessageHandler;
