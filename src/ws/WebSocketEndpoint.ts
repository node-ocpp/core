import path from 'path';
import merge from 'lodash.merge';
import { Server as WSServer, ServerOptions as WSOptions } from 'ws';

import OcppEndpoint, { OcppEndpointConfig } from '../common/OcppEndpoint';
import OcppProtocolVersion from '../types/ocpp/OcppProtocolVersion';
import OcppAction from '../types/ocpp/OcppAction';
import { OutboundOcppMessage } from '../common/OcppMessage';
import { OcppSessionService } from '../common/OcppSession';
import {
  BasicAuthenticationHandler,
  CertificateAuthenticationHandler,
  InboundOcppMessageHandler,
  OutboundOcppMessageHandler,
} from '../common/OcppHandlers';

type WebSocketConfig = OcppEndpointConfig & {
  protocols?: Readonly<WebSocketProtocolVersion[]>;
  wsOptions?: WSOptions;
  schemaDir?: string;
  validateSchema?: boolean;
};

const WebSocketProtocolVersions = ['ocpp1.6', 'ocpp2.0', 'ocpp2.0.1'] as const;
type WebSocketProtocolVersion = typeof WebSocketProtocolVersions[number];

type WebSocketAuthenticationHandler =
  | BasicAuthenticationHandler
  | CertificateAuthenticationHandler;

class WebSocketEndpoint extends OcppEndpoint<WebSocketConfig> {
  protected wsServer: WSServer;

  protected inboundSchemas: Map<OcppAction, OcppAction>;
  protected outboundSchemas: Map<OcppAction, OcppAction>;

  constructor(
    config: WebSocketConfig,
    authenticationHandlers: WebSocketAuthenticationHandler[],
    inboundMessageHandlers: InboundOcppMessageHandler[],
    outboundMessageHandlers?: OutboundOcppMessageHandler[],
    sessionService?: OcppSessionService
  ) {
    super(
      config,
      authenticationHandlers,
      inboundMessageHandlers,
      outboundMessageHandlers,
      sessionService
    );

    this.wsServer = new WSServer(this.config.wsOptions);
  }

  protected static defaultWsOptions: WSOptions = {
    noServer: true,
  };

  protected static defaultConfig: WebSocketConfig = {
    protocols: WebSocketProtocolVersions,
    wsOptions: WebSocketEndpoint.defaultWsOptions,
    schemaDir: path.join(__dirname, '../../var/jsonschema'),
    validateSchema: true,
  };

  protected async handleSendMessage(message: OutboundOcppMessage) {
    throw new Error('Method not implemented.');
  }

  protected async handleDropSession(clientId: string) {
    throw new Error('Method not implemented.');
  }

  protected handleDisconnect() {
    throw new Error('Method not implemented.');
  }

  protected handleUpgrade() {
    throw new Error('Method not implemented.');
  }

  protected handleCertificateAuthentication() {
    throw new Error('Method not implemented.');
  }

  protected async loadSchemas(
    direction: 'inbound' | 'outbound',
    action: OcppAction,
    protocolVersion?: OcppProtocolVersion[]
  ) {
    throw new Error('Method not implemented.');
  }

  protected validateSchema(
    direction: 'inbound' | 'outbound',
    action: OcppAction,
    message: string,
    protocolVersion?: OcppProtocolVersion[]
  ) {
    throw new Error('Method not implemented.');
  }
}

export default WebSocketEndpoint;
export { WebSocketConfig, WebSocketProtocolVersion, WebSocketProtocolVersions };
