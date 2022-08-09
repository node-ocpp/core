import OcppMessage, {
  InboundOcppMessage,
  OutboundOcppMessage,
} from './OcppMessage';

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

  static map<THandler extends AsyncHandler<unknown>>(
    handlers: THandler[]
  ): THandler[] {
    return handlers.map((handler, i) => (handler.next = handlers[i + 1]));
  }
}

abstract class OcppAuthenticationHandler<
  OcppAuthenticationRequest
> extends AsyncHandler<OcppAuthenticationRequest> {}

abstract class OcppAuthenticationRequest {}

abstract class OcppMessageHandler<
  TMessage extends OcppMessage = OcppMessage
> extends AsyncHandler<TMessage> {}

abstract class InboundOcppMessageHandler<
  TMessage extends InboundOcppMessage = InboundOcppMessage
> extends OcppMessageHandler<TMessage> {}

abstract class OutboundOcppMessageHandler<
  TMessage extends OutboundOcppMessage = OutboundOcppMessage
> extends OcppMessageHandler<TMessage> {}

export default AsyncHandler;
export {
  AsyncHandler,
  OcppAuthenticationHandler,
  OcppAuthenticationRequest,
  InboundOcppMessageHandler,
  OutboundOcppMessageHandler,
};