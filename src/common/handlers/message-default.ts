import { Logger } from 'ts-log';
import { InboundMessageHandler } from '../handler';
import { InboundMessage } from '../message';
import { RespondableMessage } from '../message';
import { OutboundCallError } from '../callerror';

class DefaultMessageHandler extends InboundMessageHandler {
  private logger: Logger;

  constructor(logger: Logger) {
    super();
    this.logger = logger;
  }

  async handle(message: InboundMessage) {
    if (message instanceof RespondableMessage && message.isResponded) {
      return;
    }

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
