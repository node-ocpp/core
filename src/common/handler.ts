import { BaseHandler } from './util/handler';
import OcppMessage, { InboundMessage, OutboundMessage } from './message';

abstract class OcppMessageHandler<
  TMessage extends OcppMessage = OcppMessage
> extends BaseHandler<TMessage> {}

abstract class InboundMessageHandler<
  TMessage extends InboundMessage = InboundMessage
> extends OcppMessageHandler<TMessage> {}

abstract class OutboundMessageHandler<
  TMessage extends OutboundMessage = OutboundMessage
> extends OcppMessageHandler<TMessage> {}

type ResponseHandler<TResponse extends OutboundMessage> = (
  response: TResponse
) => Promise<void>;

export { InboundMessageHandler, OutboundMessageHandler, ResponseHandler };
