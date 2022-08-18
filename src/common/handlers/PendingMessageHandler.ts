import {
  InboundOcppMessageHandler,
  OutboundOcppMessageHandler,
} from '../OcppHandlers';
import { OcppSessionService } from '../OcppSession';
import { InboundOcppMessage, OutboundOcppMessage } from '../OcppMessage';
import { InboundOcppCall, OutboundOcppCall } from '../OcppCallMessage';

class InboundPendingMessageHandler extends InboundOcppMessageHandler {
  private sessionService;

  constructor(sessionService: OcppSessionService) {
    super();
    this.sessionService = sessionService;
    this.sessionService.create();
  }

  async handle(message: InboundOcppMessage) {
    const session = await this.sessionService.get(message.sender.id);

    if (
      !(message instanceof InboundOcppCall) &&
      session.pendingOutboundMessage &&
      message.id === session.pendingOutboundMessage.id
    ) {
      session.pendingOutboundMessage = null;
      this.sessionService.update(session.client.id, session);
    }

    if (message instanceof InboundOcppCall && !session.pendingInboundMessage) {
      session.pendingInboundMessage = message;
      this.sessionService.update(session.client.id, session);
    }

    return super.handle(message);
  }
}

class OutboundPendingMessageHandler extends OutboundOcppMessageHandler {
  private sessionService;

  constructor(sessionService: OcppSessionService) {
    super();
    this.sessionService = sessionService;
    this.sessionService.create();
  }

  async handle(message: OutboundOcppMessage) {
    const session = await this.sessionService.get(message.recipient.id);

    if (
      !(message instanceof OutboundOcppCall) &&
      session.pendingInboundMessage &&
      message.id === session.pendingInboundMessage.id
    ) {
      session.pendingInboundMessage = null;
      this.sessionService.update(session.client.id, session);
    }

    if (
      message instanceof OutboundOcppCall &&
      !session.pendingOutboundMessage
    ) {
      session.pendingOutboundMessage = message;
      this.sessionService.update(session.client.id, session);
    }

    return super.handle(message);
  }
}

export { InboundPendingMessageHandler, OutboundPendingMessageHandler };
