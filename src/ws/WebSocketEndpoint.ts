/* eslint-disable node/no-unpublished-require */
import basicAuth from 'basic-auth';
import path from 'path';
import { Duplex } from 'stream';
import { IncomingMessage as HTTPRequest, STATUS_CODES } from 'http';
import { WebSocket, Server as WSServer, ServerOptions as WSOptions } from 'ws';

import OcppEndpoint, { OcppEndpointConfig } from '../common/OcppEndpoint';
import OcppProtocolVersion from '../types/ocpp/OcppProtocolVersion';
import OcppMessageType from '../types/ocpp/OcppMessageType';
import OcppAction from '../types/ocpp/OcppAction';
import {
  InboundOcppMessage,
  OcppMessagePayload,
  OutboundOcppMessage,
} from '../common/OcppMessage';
import { OcppClient, OcppSessionService } from '../common/OcppSession';
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
  route?: string;
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
    this._config = merge(this.defaultEndpointConfig, this.config);

    this.wsServer = new WSServer(this.config.wsOptions);
    this.httpServer.on('upgrade', this.handleHttpUpgrade);
    this.wsServer.on('connection', this.handleWsConnect);
    this.wsServer.on('close', this.handleWsDisconnect);
  }

  protected get defaultWsOptions() {
    return {
      noServer: true,
    } as WSOptions;
  }

  protected get defaultEndpointConfig() {
    return {
      route: 'ocpp',
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
    const requestPath = path.parse(request.url);
    const basicCredentials = basicAuth(request);
    const basicAuthEnabled = this.config.basicAuth;

    const clientProtocols =
      request.headers['sec-websocket-protocol']?.split(',');
    const supportedProtocols = this.config.protocols.filter(protocol =>
      clientProtocols?.includes(protocol)
    ) as WebSocketProtocolVersion[];

    const authRequest = new (class extends OcppAuthenticationRequest {
      client = new OcppClient(requestPath.base);
      protocols = supportedProtocols;

      password = basicAuthEnabled ? basicCredentials?.pass : undefined;

      accept(protocol = this.protocols[0]) {
        super.accept(protocol);
        acceptRequest();
      }

      reject(status = 401) {
        super.reject();
        rejectRequest(status);
      }
    })();

    const acceptRequest = async () => {
      await this.onAuthenticationSuccess(authRequest);

      this.wsServer.handleUpgrade(request, socket, head, ws => {
        this.wsServer.emit('connection', ws, request, authRequest.client);
      });
    };

    const rejectRequest = (status: number) => {
      this.onAuthenticationFailure(authRequest);
      socket.write(`HTTP/1.1 ${status} ${STATUS_CODES[status]}\r\n\r\n`);
      socket.destroy();
    };

    const trimSlashesRegex = /^\/+|\/+$/g;
    if (
      requestPath.dir.replaceAll(trimSlashesRegex, '') !==
      this.config.route.replaceAll(trimSlashesRegex, '')
    ) {
      authRequest.reject(400);
      throw new Error(
        `Client attempted authentication on invalid route: ${request.url}`
      );
    }

    if (!clientProtocols) {
      authRequest.reject(400);
      throw new Error(
        `Client with id ${authRequest.client.id} attempted authentication
        without specifying any WebSocket subprotocol`
      );
    }

    if (supportedProtocols.length === 0) {
      authRequest.reject(400);
      throw new Error(
        `Client with id ${authRequest.client.id} attempted authentication
        with unsupported WebSocket subprotocol(s): ${clientProtocols}`
      );
    }

    if (this.config.basicAuth && !basicCredentials) {
      authRequest.reject(400);
      throw new Error(
        `Client with id ${authRequest.client.id} attempted
        authentication without supplying BASIC credentials`
      );
    }

    if (
      this.config.basicAuth &&
      basicCredentials.name !== authRequest.client.id
    ) {
      authRequest.reject(400);
      throw new Error(
        `Client attempted authentication with mismatching ids
        ${authRequest.client.id} in request path and ${basicCredentials.name}
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

      let rawMessage: Array<any>;
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

      const type: number = rawMessage[0];
      if (
        typeof type !== 'number' ||
        !Object.values(OcppMessageType).includes(type)
      ) {
        errorResponse.description = 'Missing or invalid message type field';
        this.sendMessage(errorResponse).then(() => {
          throw new Error(
            `Received message from client with id ${client.id}
            with missing or invalid message type field: ${data.toString()}`
          );
        });
      }

      const id: string = rawMessage[1];
      if (typeof id !== 'string') {
        errorResponse.description = 'Missing or invalid message id field';
        this.sendMessage(errorResponse).then(() => {
          throw new Error(
            `Received message from client with id ${client.id}
            with missing or invalid message id field: ${data.toString()}`
          );
        });
      }

      const session = await this.sessionService.get(client.id);
      const action: OcppAction =
        type === OcppMessageType.CALL
          ? rawMessage[2]
          : session.pendingOutboundMessage?.action;

      if (type === OcppMessageType.CALL && typeof action !== 'string') {
        errorResponse.description = 'Missing or invalid message action field';
        this.sendMessage(errorResponse).then(() => {
          throw new Error(
            `Received CALL message from client with id ${client.id}
            with missing or invalid message action field: ${data.toString()}`
          );
        });
      }

      const errorCode = rawMessage[2];
      const errorDescription = rawMessage[3];
      if (
        type === OcppMessageType.CALLERROR &&
        (typeof errorCode !== 'string' || typeof errorDescription !== 'string')
      ) {
        errorResponse.description = 'Invalid message type, id or action';
        this.sendMessage(errorResponse).then(() => {
          throw new Error(
            `Received CALLERROR message from client with id ${client.id} with
            missing or invalid error code/desctiption values: ${data.toString()}`
          );
        });
      }

      const payload: OcppMessagePayload =
        type === OcppMessageType.CALL
          ? rawMessage[3]
          : type === OcppMessageType.CALLRESULT
          ? rawMessage[2]
          : type === OcppMessageType.CALLERROR
          ? rawMessage[4]
          : null;

      if (this.config.validateSchema) {
        const validation = this.validateSchema(
          'inbound',
          action,
          data.toString(),
          session.protocol
        );

        if (!validation) {
          return; // to be implemented
        }
      }

      let message: InboundOcppMessage;
      switch (type) {
        case OcppMessageType.CALL:
          message = new InboundOcppCall(id, action, payload, client);
          break;

        case OcppMessageType.CALLRESULT:
          message = new InboundOcppCallResult(id, client, payload);
          break;

        case OcppMessageType.CALLERROR:
          message = new InboundOcppCallError(
            id,
            client,
            errorCode,
            errorDescription,
            payload
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
