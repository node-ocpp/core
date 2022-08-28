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
  BasicAuthenticationHandler,
  BasicAuthenticationRequest,
  CertificateAuthenticationHandler,
  InboundOcppMessageHandler,
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
    let accepted = false,
      rejected = false;

    const basicCredentials = basicAuth(request);
    const requestPath = path.parse(new URL(request.url).pathname);
    const client = new OcppClient(requestPath.base);
    const protocol = request.headers[
      'sec-websocket-protocol'
    ] as OcppProtocolVersion;

    const authRequest = <OcppAuthenticationRequest>{
      client,
      protocol,

      accept: () => {
        if (accepted || rejected) {
          throw new Error(
            `accept() was called but authentication attempt from
            client with id ${client.id} has already been
            ${accepted ? 'accepted' : rejected ? 'rejected' : ''}`
          );
        }

        accepted = true;
        this.onSessionCreated(new OcppSession(client, protocol));
        this.wsServer.handleUpgrade(request, socket, head, ws => {
          this.wsServer.emit('connection', ws, request, client);
        });
      },

      /* eslint-disable @typescript-eslint/no-inferrable-types */
      reject: (status: number = 401) => {
        if (accepted || rejected) {
          throw new Error(
            `reject() was called but authentication attempt from
            client with id ${client.id} has already been
            ${accepted ? 'accepted' : rejected ? 'rejected' : ''}`
          );
        }

        rejected = true;
        this.onConnectionRejected(authRequest);
        socket.write(`HTTP/1.1 ${status} ${STATUS_CODES[status]}\r\n\r\n`);
        socket.destroy();
      },
    };

    if (!this.config.protocols.includes(protocol)) {
      authRequest.reject(400);
      throw new Error(
        `Client with id ${client.id} attempted authentication
        with unsupported subprotocol ${protocol}`
      );
    }

    if (this.config.basicAuth && basicCredentials?.name !== client.id) {
      authRequest.reject(400);
      throw new Error(
        `Client attempted authentication with mismatching ids ${client.id}
        in request path and ${basicCredentials.name} in BASIC credentials`
      );
    }

    if (this.config.basicAuth && basicCredentials) {
      const basicAuthRequest = <BasicAuthenticationRequest>{
        ...authRequest,
        password: basicCredentials.pass,
      };
      await this.handleBasicAuth(basicAuthRequest);

      if (accepted || rejected) {
        return;
      }
    }
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
