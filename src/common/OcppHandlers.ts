import OcppClient from './OcppClient';
import OcppSession from './OcppSession';
import { InboundOcppMessage } from '../types/ocpp/OcppMessage';

abstract class AsyncHandler<T> {
  private _next!: AsyncHandler<T>;

  set next(handler: AsyncHandler<T>) {
    this._next = handler;
  }

  handle(request: T): Promise<T> {
    if (this._next) {
      return this._next.handle(request);
    }

    return null as any;
  }
}

function mapHandlers<T>(handlers: AsyncHandler<T>[]) {
  handlers.forEach((handler: AsyncHandler<T>, i: number) => {
    handler.next = handlers[i + 1];
  });
}

abstract class OcppAuthenticationHandler<
  TClient extends OcppClient,
  TSession extends OcppSession<TClient>,
  TAuthenticationProperties extends OcppAuthenticationProperties<TClient, TSession>
> extends AsyncHandler<TAuthenticationProperties> {
  abstract handle(properties: TAuthenticationProperties): Promise<TAuthenticationProperties>;
  }

interface OcppAuthenticationProperties<
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
export { mapHandlers, OcppAuthenticationHandler, OcppAuthenticationProperties, OcppMessageHandler };
