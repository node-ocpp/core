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

interface SessionStorage {
  set(clientId: string, session: Session): void;
  get(clientId: string): Session | null;
  has(clientId: string): boolean;
  size: number;
}

export default Session;
export { Client, SessionStorage };
