interface Handler<TRequest> {
  handle(request: TRequest): Promise<TRequest | void>;
  set next(handler: Handler<TRequest>);
}

type HandlerRequest<THandler> = THandler extends Handler<infer TRequest>
  ? TRequest
  : never;

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

class HandlerChain<THandler extends Handler<unknown>> {
  private handlers: THandler[];

  constructor(...handlers: THandler[]) {
    this.handlers = handlers;
    this.mapHandlers();
  }

  async handle(request: HandlerRequest<THandler>) {
    return await this.handlers[0].handle(request);
  }

  add(handler: THandler, pos: number = this.size) {
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
export { BaseHandler, HandlerChain };
