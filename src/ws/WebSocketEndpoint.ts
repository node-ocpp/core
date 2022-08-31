import path from 'path';
import merge from 'lodash.merge';
import basicAuth from 'basic-auth';
import { URL } from 'url';
import { Buffer } from 'buffer';
import { Duplex } from 'stream';
import { IncomingMessage as HTTPRequest, STATUS_CODES } from 'http';
import { WebSocket, Server as WSServer, ServerOptions as WSOptions } from 'ws';

import OcppEndpoint, { OcppEndpointConfig } from '../common/OcppEndpoint';
import OcppProtocolVersion from '../types/ocpp/OcppProtocolVersion';
import OcppAction from '../types/ocpp/OcppAction';
import { OutboundOcppMessage } from '../common/OcppMessage';
import OcppSession, {
  OcppClient,
  OcppSessionService,
} from '../common/OcppSession';
import {
  InboundOcppMessageHandler,
  OcppAuthenticationHandler,
  OcppAuthenticationRequest,
  OutboundOcppMessageHandler,
} from '../common/OcppHandlers';

type WebSocketConfig = OcppEndpointConfig & {
  protocols?: Readonly<WebSocketProtocolVersion[]>;
  wsOptions?: WSOptions;
  schemaDir?: string;
  validateSchema?: boolean;
  basicAuth?: boolean;
  certificateAuth?: boolean;
};

const WebSocketProtocolVersions = ['ocpp1.6', 'ocpp2.0', 'ocpp2.0.1'] as const;
type WebSocketProtocolVersion = typeof WebSocketProtocolVersions[number];

class WebSocketEndpoint extends OcppEndpoint<WebSocketConfig> {
  protected wsServer: WSServer;

  protected inboundSchemas: Map<OcppAction, OcppAction>;
  protected outboundSchemas: Map<OcppAction, OcppAction>;

  constructor(
    config: WebSocketConfig,
    authenticationHandlers: OcppAuthenticationHandler[],
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
    this.httpServer.on('upgrade', this.handleUpgrade);
    this.wsServer.on('connection', this.handleConnect);
    this.wsServer.on('close', this.handleDisconnect);
  }

  protected get defaultWsOptions() {
    return {
      path: this.config.path,
      noServer: true,
    } as WSOptions;
  }

  protected get defaultConfig() {
    return {
      protocols: WebSocketProtocolVersions,
      wsOptions: this.defaultWsOptions,
      schemaDir: path.join(__dirname, '../../var/jsonschema'),
      validateSchema: true,
    } as WebSocketConfig;
  }

  protected async handleSendMessage(message: OutboundOcppMessage) {
    throw new Error('Method not implemented.');
  }

  protected async handleDropSession(clientId: string) {
    throw new Error('Method not implemented.');
  }

  protected async handleUpgrade(
    request: HTTPRequest,
    socket: Duplex,
    head: Buffer
  ) {
    const basicCredentials = basicAuth(request);
    const requestPath = path.parse(new URL(request.url).pathname);

    const authRequest =
      new (class extends OcppAuthenticationRequest<WebSocketEndpoint> {
        client = new OcppClient(requestPath.base);
        protocol = request.headers[
          'sec-websocket-protocol'
        ] as OcppProtocolVersion;

        password = this._parent.config.basicAuth
          ? basicCredentials?.pass
          : null;

        accept() {
          super.accept();
          this._parent.onSessionCreated(
            new OcppSession(this.client, this.protocol)
          );
          this._parent.wsServer.handleUpgrade(request, socket, head, ws => {
            this._parent.wsServer.emit('connection', ws, request, this.client);
          });
        }

        reject(status = 401) {
          super.reject();
          this._parent.onConnectionRejected(authRequest);
          socket.write(`HTTP/1.1 ${status} ${STATUS_CODES[status]}\r\n\r\n`);
          socket.destroy();
        }
      })(this);

    if (!this.config.protocols.includes(authRequest.protocol)) {
      authRequest.reject(400);
      throw new Error(
        `Client with id ${authRequest.client.id} attempted authentication
        with unsupported subprotocol ${authRequest.protocol}`
      );
    }

    if (
      this.config.basicAuth &&
      basicCredentials?.name !== authRequest.client.id
    ) {
      authRequest.reject(400);
      throw new Error(
        `Client attempted authentication with mismatching IDs
        ${authRequest.client.id} in request path and ${basicCredentials.name}
        in BASIC credentials`
      );
    }

    await this.handleAuthentication(authRequest);
  }

  protected async handleConnect(
    ws: WebSocket,
    request: HTTPRequest,
    client?: OcppClient
  ) {
    throw new Error('Method not implemented.');
  }

  protected handleDisconnect() {
    throw new Error('Method not implemented.');
  }

  protected async loadSchemas(
    direction: 'inbound' | 'outbound',
    action: OcppAction,
    protocolVersion?: OcppProtocolVersion[]
  ) {
    throw new Error('Method not implemented.');
  }

  protected async validateSchema(
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
