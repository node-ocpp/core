import OcppClient from './OcppClient';
import OcppSession from './OcppSession';
import OcppMessage, { InboundOcppMessage, OutboundOcppMessage } from './OcppMessage';

abstract class AsyncHandler<TRequest> {
  private _next!: AsyncHandler<TRequest>;

  set next(handler: AsyncHandler<TRequest>) {
    this._next = handler;
  }

  handle(request: TRequest): Promise<TRequest> {
    if (this._next) {
      return this._next.handle(request);
    }

    return null as any;
  }

  static map<THandler extends AsyncHandler<unknown>>(handlers: THandler[]): THandler[] {
    return handlers.map((handler, i) => (handler.next = handlers[i + 1]));
  }
}

abstract class OcppAuthenticationHandler<
  TClient extends OcppClient,
  TSession extends OcppSession<TClient>,
  TAuthenticationRequest extends OcppAuthenticationRequest<TClient, TSession>
> extends AsyncHandler<TAuthenticationRequest> {
  abstract handle(request: TAuthenticationRequest): Promise<TAuthenticationRequest>;
}

interface OcppAuthenticationRequest<
  TClient extends OcppClient,
  TSession extends OcppSession<TClient>
> {
  authenticateClient(session: TSession): void;
}

abstract class OcppMessageHandler<
  TMessage extends OcppMessage = OcppMessage
> extends AsyncHandler<TMessage> {
  abstract handle(message: TMessage): Promise<TMessage>;
}

abstract class InboundOcppMessageHandler<
  TMessage extends InboundOcppMessage = InboundOcppMessage
> extends OcppMessageHandler<TMessage> {
  abstract handle(message: TMessage): Promise<TMessage>;
}

abstract class OutboundOcppMessageHandler<
  TMessage extends OutboundOcppMessage = OutboundOcppMessage
> extends OcppMessageHandler<TMessage> {
  abstract handle(message: TMessage): Promise<TMessage>;
}

export default AsyncHandler;
export {
  AsyncHandler,
  OcppAuthenticationHandler,
  OcppAuthenticationRequest,
  InboundOcppMessageHandler,
  OutboundOcppMessageHandler,
};
