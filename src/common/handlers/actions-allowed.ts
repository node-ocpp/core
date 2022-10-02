import { Logger } from 'ts-log';
import { oneLine } from 'common-tags';

import { EndpointOptions } from '../endpoint';
import MessageType from '../../types/ocpp/type';
import { InboundMessage, OutboundMessage } from '../message';
import { InboundCall, OutboundCall } from '../call';
import { OutboundCallError } from '../callerror';
import { InboundMessageHandler, OutboundMessageHandler } from '../handler';

class InboundActionsAllowedHandler extends InboundMessageHandler {
  private config: EndpointOptions;
  private logger: Logger;

  constructor(config: EndpointOptions, logger: Logger) {
    super();
    this.config = config;
    this.logger = logger;
  }

  async handle(message: InboundMessage) {
    if (
      message instanceof InboundCall &&
      !this.config.actionsAllowed.includes(message.action)
    ) {
      this.logger.warn(
        oneLine`Received ${MessageType[message.type]}
        message with unsupported action: ${message.action}`
      );

      throw new OutboundCallError(
        message.sender,
        message.id,
        'NotImplemented',
        'Action is not supported'
      );
    }

    return await super.handle(message);
  }
}

class OutboundActionsAllowedHandler extends OutboundMessageHandler {
  private config: EndpointOptions;
  private logger: Logger;

  constructor(config: EndpointOptions, logger: Logger) {
    super();
    this.config = config;
    this.logger = logger;
  }

  async handle(message: OutboundMessage) {
    if (
      message instanceof OutboundCall &&
      !this.config.actionsAllowed.includes(message.action)
    ) {
      this.logger.warn(
        oneLine`Attempted to send ${MessageType[message.type]}
        message with unsupported action: ${message.action}`
      );
      return;
    }

    return await super.handle(message);
  }
}

export { InboundActionsAllowedHandler, OutboundActionsAllowedHandler };
