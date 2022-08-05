import OcppClient from './OcppClient';
import OcppSession from './OcppSession';
import { InboundOcppMessage } from './OcppMessage';

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
  TMessage extends InboundOcppMessage
> extends AsyncHandler<TMessage> {
  abstract handle(message: TMessage): Promise<TMessage>;
}

export default AsyncHandler;
export { AsyncHandler, OcppAuthenticationHandler, OcppAuthenticationRequest, OcppMessageHandler };
