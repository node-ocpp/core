import Session from '../session';
import { InboundMessage, OutboundMessage } from '../message';
import { InboundMessageHandler, OutboundMessageHandler } from '../handler';
import { InboundCall, OutboundCall } from '../call';

class InboundPendingMessageHandler extends InboundMessageHandler {
  private sessions;

  constructor(sessions: Map<string, Session>) {
    super();
    this.sessions = sessions;
  }

  async handle(message: InboundMessage) {
    const session = this.sessions.get(message.sender.id);

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
    this.sessions.set(session.client.id, session);

    return await super.handle(message);
  }
}

class OutboundPendingMessageHandler extends OutboundMessageHandler {
  private sessions;

  constructor(sessions: Map<string, Session>) {
    super();
    this.sessions = sessions;
  }

  async handle(message: OutboundMessage) {
    const session = this.sessions.get(message.recipient.id);

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
    this.sessions.set(session.client.id, session);

    return await super.handle(message);
  }
}

export { InboundPendingMessageHandler, OutboundPendingMessageHandler };
