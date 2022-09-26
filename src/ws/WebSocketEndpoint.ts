/* eslint-disable node/no-unpublished-require */
import path from 'path';
import basicAuth from 'basic-auth';
import { URL } from 'url';
import { Duplex } from 'stream';
import { IncomingMessage as HTTPRequest, STATUS_CODES } from 'http';
import { WebSocket, Server as WSServer, ServerOptions as WSOptions } from 'ws';

import OcppEndpoint, { OcppEndpointConfig } from '../common/OcppEndpoint';
import OcppProtocolVersion from '../types/ocpp/OcppProtocolVersion';
import OcppMessageType from '../types/ocpp/OcppMessageType';
import OcppAction from '../types/ocpp/OcppAction';
import { InboundOcppMessage, OutboundOcppMessage } from '../common/OcppMessage';
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
import {
  InboundOcppCallError,
  OutboundOcppCallError,
} from '../common/OcppCallErrorMessage';
import { InboundOcppCall } from '../common/OcppCallMessage';
import { InboundOcppCallResult } from '../common/OcppCallResultMessage';
import merge from 'lodash.merge';

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
    merge(this.config, this.defaultEndpointConfig);

    this.wsServer = new WSServer(this.config.wsOptions);
    this.httpServer.on('upgrade', this.handleHttpUpgrade);
    this.wsServer.on('connection', this.handleWsConnect);
    this.wsServer.on('close', this.handleWsDisconnect);
  }

  protected get defaultWsOptions() {
    return {
      path: 'ocpp',
      noServer: true,
    } as WSOptions;
  }

  protected get defaultEndpointConfig() {
    return {
      protocols: WebSocketProtocolVersions,
      wsOptions: this.defaultWsOptions,
      schemaDir: path.join(__dirname, '../../../var/jsonschema'),
      validateSchema: true,
      basicAuth: true,
      certificateAuth: true,
    } as WebSocketConfig;
  }

  protected async handleSendMessage(message: OutboundOcppMessage) {
    throw new Error('Method not implemented.');
  }

  protected async handleDropSession(clientId: string) {
    throw new Error('Method not implemented.');
  }

  protected handleHttpUpgrade = (
    request: HTTPRequest,
    socket: Duplex,
    head: Buffer
  ) => {
    const basicCredentials = basicAuth(request);
    const basicAuthEnabled = this.config.basicAuth;
    const clientId = path.parse(request.url).base;

    const authRequest = new (class extends OcppAuthenticationRequest {
      client = new OcppClient(clientId);
      protocol = request.headers[
        'sec-websocket-protocol'
      ] as OcppProtocolVersion;

      password = basicAuthEnabled ? basicCredentials?.pass : null;

      accept() {
        super.accept();
        acceptRequest();
      }

      reject(status = 401) {
        super.reject();
        rejectRequest(status);
      }
    })();

    const acceptRequest = () => {
      this.onSessionCreated(
        new OcppSession(authRequest.client, authRequest.protocol)
      );
      this.wsServer.handleUpgrade(request, socket, head, ws => {
        this.wsServer.emit('connection', ws, request, authRequest.client);
        return true;
      });
    };

    const rejectRequest = (status: number) => {
      this.onConnectionRejected(authRequest);
      socket.write(`HTTP/1.1 ${status} ${STATUS_CODES[status]}\r\n\r\n`);
      socket.destroy();
    };

    if (!this.config.protocols.includes(authRequest.protocol)) {
      authRequest.reject(400);
      throw new Error(
        `Client with id ${authRequest.client.id} attempted authentication
        with unsupported subprotocol ${authRequest.protocol}`
      );
    }

    if (this.config.basicAuth && basicCredentials?.name !== clientId) {
      authRequest.reject(400);
      throw new Error(
        `Client attempted authentication with mismatching ids
        ${clientId} in request path and ${basicCredentials.name}
        in BASIC credentials`
      );
    }

    this.onAuthenticationAttempt(authRequest);
  };

  protected handleWsConnect = (
    ws: WebSocket,
    request: HTTPRequest,
    client: OcppClient
  ) => {
    ws.on('message', async (data, isBinary) => {
      if (isBinary) {
        throw new Error(
          `Received binary message from client with id
          ${client.id} which is currently not supported`
        );
      }

      const errorResponse = new OutboundOcppCallError(
        null,
        'ProtocolError',
        null,
        null,
        client
      );

      let rawMessage;
      try {
        rawMessage = JSON.parse(data.toString());
      } catch (e) {
        errorResponse.description = 'Invalid JSON format';
        this.sendMessage(errorResponse).then(() => {
          throw new Error(
            `Error while attempting to deserialize JSON
            message from client with id ${client.id}`,
            { cause: e as Error }
          );
        });
      }

      if (
        typeof rawMessage.type !== 'number' ||
        !Object.values(OcppMessageType).includes(rawMessage.type) ||
        typeof rawMessage.id !== 'string' ||
        (rawMessage.type === OcppMessageType.CALL &&
          typeof rawMessage.action !== 'string')
      ) {
        errorResponse.description = 'Invalid message type, id or action';
        this.sendMessage(errorResponse).then(() => {
          throw new Error(
            `Received message from client with id ${client.id}
            without valid message type, id or action field`
          );
        });
      }

      if (this.config.validateSchema) {
        const session = await this.sessionService.get(client.id);
        const action =
          rawMessage.type === OcppMessageType.CALL
            ? rawMessage.action
            : session.pendingOutboundMessage.action;

        const validation = this.validateSchema(
          'inbound',
          action,
          rawMessage,
          session.protocol
        );

        if (!validation) {
          return; // to be implemented
        }
      }

      let message: InboundOcppMessage;
      switch (rawMessage.type) {
        case OcppMessageType.CALL:
          message = new InboundOcppCall(
            rawMessage.id,
            rawMessage.action,
            rawMessage.data,
            client
          );
          break;

        case OcppMessageType.CALLRESULT:
          message = new InboundOcppCallResult(
            rawMessage.id,
            client,
            rawMessage.data
          );
          break;

        case OcppMessageType.CALLERROR:
          message = new InboundOcppCallError(
            rawMessage.id,
            client,
            rawMessage.code,
            rawMessage.description,
            rawMessage.details
          );
          break;
      }

      this.onInboundMessage(message);
    });
  };

  protected handleWsDisconnect = () => {
    throw new Error('Method not implemented.');
  };

  protected async loadSchemas(
    direction: 'inbound' | 'outbound',
    action: OcppAction,
    protocolVersion?: OcppProtocolVersion
  ) {
    throw new Error('Method not implemented.');
  }

  protected async validateSchema(
    direction: 'inbound' | 'outbound',
    action: OcppAction,
    message: string,
    protocolVersion?: OcppProtocolVersion
  ) {
    throw new Error('Method not implemented.');
  }
}

export default WebSocketEndpoint;
export { WebSocketConfig, WebSocketProtocolVersion, WebSocketProtocolVersions };
