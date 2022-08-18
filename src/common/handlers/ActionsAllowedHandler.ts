import { OutboundOcppCallError } from '../OcppCallErrorMessage';
import { InboundOcppCall, OutboundOcppCall } from '../OcppCallMessage';
import { OcppEndpointConfig } from '../OcppEndpoint';
import {
  InboundOcppMessageHandler,
  OutboundOcppMessageHandler,
} from '../OcppHandlers';
import { InboundOcppMessage, OutboundOcppMessage } from '../OcppMessage';

class InboundActionsAllowedHandler extends InboundOcppMessageHandler {
  private config: OcppEndpointConfig;

  constructor(config: OcppEndpointConfig) {
    super();
    this.config = config;
  }

  async handle(message: InboundOcppMessage) {
    if (
      message instanceof InboundOcppCall &&
      !this.config.actionsAllowed.includes(message.action)
    ) {
      throw new OutboundOcppCallError(
        message.id,
        'NotImplemented',
        `Action ${message.action} is not supported`,
        null,
        message.sender
      );
    }

    return super.handle(message);
  }
}

class OutboundActionsAllowedHandler extends OutboundOcppMessageHandler {
  private config: OcppEndpointConfig;

  constructor(config: OcppEndpointConfig) {
    super();
    this.config = config;
  }

  async handle(message: OutboundOcppMessage) {
    if (
      message instanceof OutboundOcppCall &&
      !this.config.actionsAllowed.includes(message.action)
    ) {
      throw new Error(`Action ${message.action} is not supported`);
    }

    return super.handle(message);
  }
}

export { InboundActionsAllowedHandler, OutboundActionsAllowedHandler };
