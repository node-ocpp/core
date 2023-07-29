interface Handler<TRequest> {
  handle(request: TRequest): Promise<TRequest | void>;
  set next(handler: Handler<TRequest>);
}

abstract class BaseHandler<TRequest> implements Handler<TRequest> {
  private _next!: BaseHandler<TRequest>;

  set next(handler: BaseHandler<TRequest>) {
    this._next = handler;
  }

  handle(request: TRequest): Promise<TRequest | void> {
    if (this._next) {
      return this._next.handle(request);
    }

    return null as any;
  }

  static map<THandler extends BaseHandler<unknown>>(
    handlers: THandler[]
  ): THandler[] {
    return handlers.map((handler, i) => {
      handler.next = handlers[i + 1];
      return handler;
    });
  }
}

export default Handler;
export { BaseHandler };
