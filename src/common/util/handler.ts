import { Logger } from 'ts-log';

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
  private logger: Logger;
  private handlers: THandler[];

  constructor(logger: Logger, ...handlers: THandler[]) {
    this.logger = logger;

    this.handlers = handlers.map((handler, i) => {
      handler.next = this.handlers[i + 1];
      return handler;
    });

    this.logger.debug(
      `Loaded ${this.length} handlers of type ${
        Object.getPrototypeOf(this.handlers[0].constructor).name
      }`
    );
    this.logger.trace({
      ...this.handlers.map(handler => handler.constructor.name),
    });
  }

  async handle(request: HandlerRequest<THandler>) {
    return await this.handlers[0].handle(request);
  }

  get length() {
    return this.handlers.length;
  }
}

export default Handler;
export { BaseHandler, HandlerChain };
