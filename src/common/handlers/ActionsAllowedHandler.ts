import OcppAction from '../../types/ocpp/OcppAction';
import { OutboundOcppCallError } from '../OcppCallErrorMessage';
import { InboundOcppCall } from '../OcppCallMessage';
import { InboundOcppMessageHandler } from '../OcppHandlers';
import { InboundOcppMessage } from '../OcppMessage';

class InboundActionsAllowedHandler extends InboundOcppMessageHandler {
  private actionsAllowed: Readonly<OcppAction[]>;

  constructor(actionsAllowed: Readonly<OcppAction[]>) {
    super();
    this.actionsAllowed = actionsAllowed;
  }

  async handle(message: InboundOcppMessage) {
    if (
      message instanceof InboundOcppCall &&
      !this.actionsAllowed.includes(message.action)
    ) {
      throw new OutboundOcppCallError(
        message.id,
        'NotImplemented',
        `Action ${message.action} is not supported`,
        null,
        message.sender
      );
    }

    return super.handle(message);
  }
}

export { InboundActionsAllowedHandler };
