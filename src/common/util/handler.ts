interface Handler<TRequest> {
  handle: HandlerFunction<TRequest>;
  set next(handler: Handler<TRequest>);
}

type HandlerFunction<TRequest> = (request: TRequest) => Promise<TRequest>;

// Infer Request type from Handler
type HandlerRequest<THandler> = THandler extends Handler<infer TRequest>
  ? TRequest
  : never;

abstract class BaseHandler<TRequest> implements Handler<TRequest> {
  private _next!: BaseHandler<TRequest>;

  set next(handler: BaseHandler<TRequest>) {
    this._next = handler;
  }

  handle(request: TRequest): Promise<TRequest> {
    if (this._next) {
      return this._next.handle(request);
    }

    return null as any;
  }

  static fromFunction<TRequest>(handler: HandlerFunction<TRequest>) {
    return new (class extends BaseHandler<TRequest> {
      handle = handler as HandlerFunction<TRequest>;
    })() as Handler<TRequest>;
  }
}

class HandlerChain<
  THandler extends Handler<TRequest>,
  TRequest = HandlerRequest<THandler>
> {
  private handlers: THandler[];

  constructor(...handlers: Array<THandler | HandlerFunction<TRequest>>) {
    handlers = handlers.map(handler =>
      typeof handler === 'function'
        ? (BaseHandler.fromFunction(handler) as THandler)
        : handler
    );

    this.handlers = handlers as THandler[];
    this.mapHandlers();
  }

  async handle(request: HandlerRequest<THandler>) {
    return await this.handlers[0].handle(request);
  }

  add(handler: THandler | HandlerFunction<TRequest>, pos: number = this.size) {
    if (typeof handler === 'function') {
      handler = BaseHandler.fromFunction(handler) as THandler;
    }

    this.handlers.splice(pos, 0, handler);
    this.mapHandlers();
  }

  remove(handler: THandler) {
    this.handlers = this.handlers.filter(_handler => _handler === handler);
    this.mapHandlers();
  }

  private mapHandlers() {
    this.handlers = this.handlers.map((handler, i) => {
      handler.next = this.handlers[i + 1];
      return handler;
    });
  }

  get size() {
    return this.handlers.length;
  }

  toString() {
    return JSON.stringify(
      { ...this.handlers.map(handler => handler.constructor.name) },
      null,
      '  '
    );
  }
}

export default Handler;
export { BaseHandler, HandlerChain, HandlerFunction, HandlerRequest };
