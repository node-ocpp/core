import { logObject } from './logger';

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

  async handle(request: TRequest): Promise<TRequest> {
    if (this._next) {
      return await this._next.handle(request);
    } else {
      return request;
    }
  }

  static fromFunction<TRequest>(handler: HandlerFunction<TRequest>) {
    return new (class AnonymousHandler extends BaseHandler<TRequest> {
      async handle(request: TRequest) {
        return await super.handle(await handler(request));
      }
    })() as Handler<TRequest>;
  }
}

class HandlerChain<
  THandler extends Handler<TRequest>,
  TRequest = HandlerRequest<THandler>
> {
  private handlers: THandler[];

  constructor(...handlers: Array<THandler | HandlerFunction<TRequest>>) {
    this.handlers = handlers.map(handler =>
      typeof handler === 'function'
        ? (BaseHandler.fromFunction(handler) as THandler)
        : handler
    );
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
    this.handlers = this.handlers.filter(_handler => _handler !== handler);
    this.mapHandlers();
  }

  private mapHandlers() {
    this.handlers.forEach((handler, i, handlers) => {
      handler.next = handlers[i + 1];
    });
  }

  get size() {
    return this.handlers.length;
  }

  toString() {
    return logObject({
      ...this.handlers.map(handler => handler.constructor.name),
    });
  }
}

export default Handler;
export { BaseHandler, HandlerChain, HandlerFunction, HandlerRequest };
