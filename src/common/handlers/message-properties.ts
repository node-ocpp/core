import { InboundMessageHandler } from '../handler';
import OcppAction from '../../types/ocpp/action';
import { Payload } from '../message';
import { InboundCall } from '../call';
import { InboundCallResult, OutboundCallResult } from '../callresult';

type ActionHandlerCallback = (data: Payload) => Promise<any>;

class ActionHandler extends InboundMessageHandler {
  private action: OcppAction;
  private handler: ActionHandlerCallback;

  constructor(action: OcppAction, handler: ActionHandlerCallback) {
    super();
    this.action = action;
    this.handler = handler;
  }

  async handle(message: InboundCall) {
    if (!(message instanceof InboundCall) || this.action !== message.action) {
      return await super.handle(message);
    }

    const responseData = await this.handler(message.data);

    if (!responseData) {
      return await super.handle(message);
    }

    const response = new OutboundCallResult(
      message.sender,
      message.id,
      responseData
    );
    await message.respond(response);
  }
}

type IdHandlerCallback = (data: Payload) => Promise<void>;

class IdHandler extends InboundMessageHandler {
  private id: string;
  private handler: IdHandlerCallback;

  constructor(id: string, handler: IdHandlerCallback) {
    super();
    this.id = id;
    this.handler = handler;
  }

  async handle(message: InboundCallResult) {
    if (this.id !== message.id) {
      return await super.handle(message);
    }

    await this.handler(message.data);
  }
}

export { ActionHandler, IdHandler, ActionHandlerCallback, IdHandlerCallback };
