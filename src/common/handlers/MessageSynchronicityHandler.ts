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

  constructor(sessionService: OcppSessionService) {
    super();
    this.sessionService = sessionService;
    this.sessionService.create();
  }

  async handle(message: InboundOcppMessage) {
    const session = await this.sessionService.get(message.sender.id);
    const messageType = OcppMessageType[message.type];

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
      throw new OutboundOcppCallError(
        message.sender,
        message.id,
        'ProtocolError',
        `Received ${messageType} message with id ${message.id} from client with
        id ${message.sender.id} which does not match pending outbound CALL
        message with id ${session.pendingOutboundMessage.id}`,
        message
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
      throw new OutboundOcppCallError(
        message.sender,
        message.id,
        'ProtocolError',
        `Received ${messageType} message from client with id
        ${message.sender.id} while there is no pending outbound CALL message`,
        message
      );
    }

    /*
    The client must not send further CALL messages until the previous one
    has been responded to by the server.
    */
    if (session.pendingInboundMessage && message instanceof InboundOcppCall) {
      throw new OutboundOcppCallError(
        message.sender,
        message.id,
        'ProtocolError',
        `Received CALL message from client with id ${message.sender.id}
        while there is already a pending inbound CALL message`,
        message
      );
    }

    return super.handle(message);
  }
}

class OutboundMessageSynchronicityHandler extends OutboundOcppMessageHandler {
  private _sessionService;

  constructor(sessionService: OcppSessionService) {
    super();
    this._sessionService = sessionService;
  }

  async handle(message: OutboundOcppMessage) {
    return super.handle(message);
  }
}

export {
  InboundMessageSynchronicityHandler,
  OutboundMessageSynchronicityHandler,
};
