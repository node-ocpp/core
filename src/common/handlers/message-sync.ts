import { Logger } from 'ts-log';
import { oneLine } from 'common-tags';

import MessageType from '../../types/ocpp/type';
import { SessionStorage } from '../session';
import { InboundMessageHandler, OutboundMessageHandler } from '../handler';
import { InboundMessage, OutboundMessage } from '../message';
import { InboundCall, OutboundCall } from '../call';
import { OutboundCallError } from '../callerror';

class InboundMessageSynchronicityHandler extends InboundMessageHandler {
  private sessionStorage;
  private logger;

  constructor(sessionStorage: SessionStorage, logger: Logger) {
    super();
    this.sessionStorage = sessionStorage;
    this.logger = logger;
  }

  async handle(message: InboundMessage) {
    const session = await this.sessionStorage.get(message.sender.id);
    let error = false;

    /*
    If the endpoint has sent an outbound CALL message, the client must respond
    with a CALLRESULT or CALLERROR with the same id as the outbound CALL.
    An inbound CALL from the client is possible even if no response for the
    pending outbound CALL message has been received yet.
    */
    if (
      session.pendingOutboundMessage &&
      !(message instanceof InboundCall) &&
      message.id !== session.pendingOutboundMessage.id
    ) {
      error = true;
      this.logger.warn(
        oneLine`Received ${MessageType[message.type]} message
        which is out of sync with pending outbound CALL message`
      );
    }

    /*
    Inbound CALLRESULT & CALLERROR messages from the client are only allowed
    if the endpoint has sent an outbound CALL message before.
    */
    if (!session.pendingOutboundMessage && !(message instanceof InboundCall)) {
      error = true;
      this.logger.warn(
        oneLine`Received ${MessageType[message.type]} message
        while there is no pending outbound CALL message`
      );
    }

    /*
    The client must not send further CALL messages until the previous one
    has been responded to by the endpoint.
    */
    if (session.pendingInboundMessage && message instanceof InboundCall) {
      error = true;
      this.logger.warn(
        oneLine`Received CALL message while there
        is already a pending inbound CALL message`
      );
    }

    if (error) {
      throw new OutboundCallError(
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

class OutboundMessageSynchronicityHandler extends OutboundMessageHandler {
  private sessionStorage;
  private logger;

  constructor(sessionStorage: SessionStorage, logger: Logger) {
    super();
    this.sessionStorage = sessionStorage;
    this.logger = logger;
  }

  async handle(message: OutboundMessage) {
    const session = await this.sessionStorage.get(message.recipient.id);

    /*
    If the client has sent an inbound CALL message, the endpoint must respond
    with a CALLRESULT or CALLERROR with the same id as the inbound CALL.
    An outbound CALL from the endpoint is possible even if no response for the
    pending inbound CALL message has been sent yet.
    */
    if (
      session.pendingInboundMessage &&
      !(message instanceof OutboundCall) &&
      message.id !== session.pendingInboundMessage.id
    ) {
      this.logger.warn(
        oneLine`Attempting to send ${MessageType[message.type]} message
        which is out of sync with pending inbound CALL message`
      );
    }

    /*
    Outbound CALLRESULT & CALLERROR messages from the endpoint are only allowed
    if the client has sent an inbound CALL message before.
    */
    if (!session.pendingInboundMessage && !(message instanceof OutboundCall)) {
      this.logger.warn(
        oneLine`Attempting to send ${MessageType[message.type]} message
        while there is no pending inbound CALL message`
      );
    }

    /*
    The endpoint must not send further CALL messages until the previous one
    has been responded to by the client.
    */
    if (session.pendingOutboundMessage && message instanceof OutboundCall) {
      this.logger.warn(
        oneLine`Attempting to send CALL message while there
        is already a pending outbound CALL message`
      );
    }

    return await super.handle(message);
  }
}

export {
  InboundMessageSynchronicityHandler,
  OutboundMessageSynchronicityHandler,
};
