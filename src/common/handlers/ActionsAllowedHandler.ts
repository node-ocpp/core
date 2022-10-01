import { Logger } from 'ts-log';
import { oneLine } from 'common-tags';

import { OcppEndpointConfig } from '../OcppEndpoint';
import OcppMessageType from '../../types/ocpp/OcppMessageType';
import { InboundOcppMessage, OutboundOcppMessage } from '../OcppMessage';
import { InboundOcppCall, OutboundOcppCall } from '../OcppCallMessage';
import { OutboundOcppCallError } from '../OcppCallErrorMessage';
import {
  InboundOcppMessageHandler,
  OutboundOcppMessageHandler,
} from '../OcppHandlers';

class InboundActionsAllowedHandler extends InboundOcppMessageHandler {
  private config: OcppEndpointConfig;
  private logger: Logger;

  constructor(config: OcppEndpointConfig, logger: Logger) {
    super();
    this.config = config;
    this.logger = logger;
  }

  async handle(message: InboundOcppMessage) {
    if (
      message instanceof InboundOcppCall &&
      !this.config.actionsAllowed.includes(message.action)
    ) {
      this.logger.warn(
        oneLine`Received ${OcppMessageType[message.type]}
        message with unsupported action: ${message.action}`
      );

      throw new OutboundOcppCallError(
        message.sender,
        message.id,
        'NotImplemented',
        'Action is not supported'
      );
    }

    return await super.handle(message);
  }
}

class OutboundActionsAllowedHandler extends OutboundOcppMessageHandler {
  private config: OcppEndpointConfig;
  private logger: Logger;

  constructor(config: OcppEndpointConfig, logger: Logger) {
    super();
    this.config = config;
    this.logger = logger;
  }

  async handle(message: OutboundOcppMessage) {
    if (
      message instanceof OutboundOcppCall &&
      !this.config.actionsAllowed.includes(message.action)
    ) {
      this.logger.warn(
        oneLine`Attempted to send ${OcppMessageType[message.type]}
        message with unsupported action: ${message.action}`
      );
      return;
    }

    return await super.handle(message);
  }
}

export { InboundActionsAllowedHandler, OutboundActionsAllowedHandler };
