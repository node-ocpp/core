import { SessionStorage } from '../session';
import { InboundMessage, OutboundMessage } from '../message';
import { InboundMessageHandler, OutboundMessageHandler } from '../handler';
import { InboundCall, OutboundCall } from '../call';

class InboundPendingMessageHandler extends InboundMessageHandler {
  private sessionStorage;

  constructor(sessionStorage: SessionStorage) {
    super();
    this.sessionStorage = sessionStorage;
  }

  async handle(message: InboundMessage) {
    const session = await this.sessionStorage.get(message.sender.id);

    if (
      !(message instanceof InboundCall) &&
      session.pendingOutboundMessage &&
      message.id === session.pendingOutboundMessage.id
    ) {
      session.pendingOutboundMessage = null;
    }

    if (message instanceof InboundCall && !session.pendingInboundMessage) {
      session.pendingInboundMessage = message;
    }

    session.lastInboundMessage = message;
    await this.sessionStorage.set(session.client.id, session);

    return await super.handle(message);
  }
}

class OutboundPendingMessageHandler extends OutboundMessageHandler {
  private sessionStorage;

  constructor(sessionStorage: SessionStorage) {
    super();
    this.sessionStorage = sessionStorage;
  }

  async handle(message: OutboundMessage) {
    const session = await this.sessionStorage.get(message.recipient.id);

    if (
      !(message instanceof OutboundCall) &&
      session.pendingInboundMessage &&
      message.id === session.pendingInboundMessage.id
    ) {
      session.pendingInboundMessage = null;
    }

    if (message instanceof OutboundCall && !session.pendingOutboundMessage) {
      session.pendingOutboundMessage = message;
    }

    session.lastOutboundMessage = message;
    await this.sessionStorage.set(session.client.id, session);

    return await super.handle(message);
  }
}

export { InboundPendingMessageHandler, OutboundPendingMessageHandler };
