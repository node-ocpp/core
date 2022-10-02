import { SessionService } from '../session';
import { InboundMessage, OutboundMessage } from '../message';
import { InboundMessageHandler, OutboundMessageHandler } from '../handler';
import { InboundCall, OutboundCall } from '../call';

class InboundPendingMessageHandler extends InboundMessageHandler {
  private sessionService;

  constructor(sessionService: SessionService) {
    super();
    this.sessionService = sessionService;
    this.sessionService.create();
  }

  async handle(message: InboundMessage) {
    const session = await this.sessionService.get(message.sender.id);

    if (
      !(message instanceof InboundCall) &&
      session.pendingOutboundMessage &&
      message.id === session.pendingOutboundMessage.id
    ) {
      session.pendingOutboundMessage = null;
      await this.sessionService.update(session.client.id, session);
    }

    if (message instanceof InboundCall && !session.pendingInboundMessage) {
      session.pendingInboundMessage = message;
      await this.sessionService.update(session.client.id, session);
    }

    return await super.handle(message);
  }
}

class OutboundPendingMessageHandler extends OutboundMessageHandler {
  private sessionService;

  constructor(sessionService: SessionService) {
    super();
    this.sessionService = sessionService;
    this.sessionService.create();
  }

  async handle(message: OutboundMessage) {
    const session = await this.sessionService.get(message.recipient.id);

    if (
      !(message instanceof OutboundCall) &&
      session.pendingInboundMessage &&
      message.id === session.pendingInboundMessage.id
    ) {
      session.pendingInboundMessage = null;
      await this.sessionService.update(session.client.id, session);
    }

    if (message instanceof OutboundCall && !session.pendingOutboundMessage) {
      session.pendingOutboundMessage = message;
      await this.sessionService.update(session.client.id, session);
    }

    return await super.handle(message);
  }
}

export { InboundPendingMessageHandler, OutboundPendingMessageHandler };
