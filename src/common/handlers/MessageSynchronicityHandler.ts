import { Logger } from 'ts-log';
import { oneLine } from 'common-tags';

import {
  InboundOcppMessageHandler,
  OutboundOcppMessageHandler,
} from '../OcppHandlers';
import { OcppSessionService } from '../OcppSession';
import { InboundOcppMessage, OutboundOcppMessage } from '../OcppMessage';
import { InboundOcppCall } from '../OcppCallMessage';
import { OutboundOcppCallError } from '../OcppCallErrorMessage';
import OcppMessageType from '../../types/ocpp/OcppMessageType';

class InboundMessageSynchronicityHandler extends InboundOcppMessageHandler {
  private sessionService;
  private logger;

  constructor(sessionService: OcppSessionService, logger: Logger) {
    super();
    this.sessionService = sessionService;
    this.logger = logger;
  }

  async handle(message: InboundOcppMessage) {
    const session = await this.sessionService.get(message.sender.id);
    let error = false;

    /*
    If the endpoint has sent an outbound CALL message, the client must respond
    with a CALLRESULT or CALLERROR with the same id as the outbound CALL.
    An inbound CALL from the client is possible even if no response for the
    pending outbound CALL message has been received yet.
    */
    if (
      session.pendingOutboundMessage &&
      !(message instanceof InboundOcppCall) &&
      message.id !== session.pendingOutboundMessage.id
    ) {
      error = true;
      this.logger.warn(
        oneLine`Received ${OcppMessageType[message.type]} message
        which is out of sync with pending outbound CALL message`
      );
    }

    /*
    Inbound CALLRESULT & CALLERROR messages from the client are only allowed
    if the server has sent an outbound CALL message before.
    */
    if (
      !session.pendingOutboundMessage &&
      !(message instanceof InboundOcppCall)
    ) {
      error = true;
      this.logger.warn(
        oneLine`Received ${OcppMessageType[message.type]} message
        while there is no pending outbound CALL message`
      );
    }

    /*
    The client must not send further CALL messages until the previous one
    has been responded to by the server.
    */
    if (session.pendingInboundMessage && message instanceof InboundOcppCall) {
      error = true;
      this.logger.warn(
        oneLine`Received CALL message while there
        is already a pending inbound CALL message`
      );
    }

    if (error) {
      throw new OutboundOcppCallError(
        message.sender,
        message.id,
        'ProtocolError',
        'Message is out of sync',
        message
      );
    }

    return await super.handle(message);
  }
}

class OutboundMessageSynchronicityHandler extends OutboundOcppMessageHandler {
  private _sessionService;

  constructor(sessionService: OcppSessionService) {
    super();
    this._sessionService = sessionService;
  }

  async handle(message: OutboundOcppMessage) {
    return await super.handle(message);
  }
}

export {
  InboundMessageSynchronicityHandler,
  OutboundMessageSynchronicityHandler,
};