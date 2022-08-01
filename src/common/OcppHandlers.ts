import OcppClient from './OcppClient';
import OcppSession from './OcppSession';
import { InboundOcppMessage } from '../types/ocpp/OcppMessage';

interface AsyncHandler<T> {
  set next(handler: AsyncHandler<T>);
  handle(request: T): Promise<T>;
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
> implements AsyncHandler<TAuthenticationProperties>
{
  _next!: OcppAuthenticationHandler<TClient, TSession, TAuthenticationProperties>;

  set next(handler: OcppAuthenticationHandler<TClient, TSession, TAuthenticationProperties>) {
    this._next = handler;
  }

  handle(properties: TAuthenticationProperties): Promise<TAuthenticationProperties> {
    if (this._next) {
      return this._next.handle(properties);
    }

    return null as any;
  }
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface OcppAuthenticationProperties<
  TClient extends OcppClient,
  TSession extends OcppSession<TClient>
> {}

abstract class OcppMessageHandler<TMessage extends InboundOcppMessage>
  implements AsyncHandler<TMessage>
{
  _next!: OcppMessageHandler<TMessage>;

  set next(handler: OcppMessageHandler<TMessage>) {
    this._next = handler;
  }

  handle(message: TMessage): Promise<TMessage> {
    if (this._next) {
      return this._next.handle(message);
    }

    return null as any;
  }
}

export default AsyncHandler;
export { mapHandlers, OcppAuthenticationHandler, OcppAuthenticationProperties, OcppMessageHandler };
