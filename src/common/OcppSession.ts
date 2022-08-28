import { InboundOcppCall, OutboundOcppCall } from './OcppCallMessage';
import OcppProtocolVersion from '../types/ocpp/OcppProtocolVersion';

class OcppSession {
  readonly client: OcppClient;
  readonly protocol: OcppProtocolVersion;
  pendingInboundMessage?: InboundOcppCall;
  pendingOutboundMessage?: OutboundOcppCall;

  constructor(client: OcppClient, protocol: OcppProtocolVersion) {
    this.client = client;
    this.protocol = protocol;
  }
}

class OcppClient {
  readonly id: string;

  constructor(id: string) {
    this.id = id;
  }
}

interface OcppSessionService {
  create(): Promise<void>;
  destroy(): Promise<void>;
  count(): Promise<number>;
  add(sesion: OcppSession): Promise<void>;
  has(clientId: string): Promise<boolean>;
  get(clientId: string): Promise<OcppSession | null>;
  update(clientId: string, session: OcppSession): Promise<void>;
  remove(clientId: string): Promise<void>;
}

export default OcppSession;
export { OcppClient, OcppSessionService };
