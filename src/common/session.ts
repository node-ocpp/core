import ProtocolVersion from '../types/ocpp/version';
import { InboundCall, OutboundCall } from './call';
import { InboundMessage, OutboundMessage } from './message';

class Session {
  readonly client: Client;
  readonly protocol: ProtocolVersion;

  pendingInboundMessage?: InboundCall;
  pendingOutboundMessage?: OutboundCall;
  lastInboundMessage?: InboundMessage;
  lastOutboundMessage?: OutboundMessage;

  constructor(client: Client, protocol: ProtocolVersion) {
    this.client = client;
    this.protocol = protocol;
  }
}

class Client {
  readonly id: string;

  constructor(id: string) {
    this.id = id;
  }
}

export default Session;
export { Client };
