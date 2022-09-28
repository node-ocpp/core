import path from 'path';
import { Duplex } from 'stream';
import { promises as fsPromises } from 'fs';
import { IncomingMessage as HTTPRequest, STATUS_CODES } from 'http';
import { WebSocket, Server as WSServer, ServerOptions as WSOptions } from 'ws';
import { validate as validateJsonSchema } from 'jsonschema';
import basicAuth from 'basic-auth';
import merge from 'lodash.merge';

import OcppEndpoint, { OcppEndpointConfig } from '../common/OcppEndpoint';
import { OcppClient, OcppSessionService } from '../common/OcppSession';
import OcppProtocolVersion, {
  OcppProtocolVersions,
} from '../types/ocpp/OcppProtocolVersion';
import OcppMessageType from '../types/ocpp/OcppMessageType';
import OcppAction from '../types/ocpp/OcppAction';
import { InboundOcppCall } from '../common/OcppCallMessage';
import { InboundOcppCallResult } from '../common/OcppCallResultMessage';

import {
  InboundOcppMessage,
  OcppMessagePayload,
  OutboundOcppMessage,
} from '../common/OcppMessage';

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

type WebSocketConfig = OcppEndpointConfig & {
  route?: string;
  protocols?: Readonly<OcppProtocolVersion[]>;
  basicAuth?: boolean;
  certificateAuth?: boolean;
  schemaValidation?: boolean;
  schemaDir?: Map<OcppProtocolVersion[], string>;

  schemaPathCallback?: (
    dir: string,
    type: 'request' | 'response',
    action: OcppAction
  ) => string;

  wsOptions?: WSOptions;
};

class WebSocketEndpoint extends OcppEndpoint<WebSocketConfig> {
  protected wsServer: WSServer;
  protected requestSchemas: Map<OcppAction, Record<string, any>>;
  protected responseSchemas: Map<OcppAction, Record<string, any>>;

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

    this.requestSchemas = new Map();
    this.responseSchemas = new Map();
  }

  protected get defaultEndpointConfig() {
    const schemaBase = path.join(__dirname, '../../../var/jsonschema');

    return {
      route: 'ocpp',
      protocols: OcppProtocolVersions,
      basicAuth: true,
      certificateAuth: true,
      schemaValidation: true,

      // OCPP <= 1.6    /var/jsonschema/ocpp1.6
      // OCPP >= 2.0    /var/jsonschema/ocpp2.0.1
      schemaDir: new Map([
        [['ocpp1.2', 'ocpp1.5', 'ocpp1.6'], path.join(schemaBase, 'ocpp1.6')],
        [['ocpp2.0', 'ocpp2.0.1'], path.join(schemaBase, 'ocpp2.0.1')],
      ]),

      // e.g. /var/jsonschema/ocpp1.6/AuthorizeRequest.json
      schemaPathCallback: (dir, type, action) =>
        path.join(dir, `${action}R${type.substring(1)}.json`),

      wsOptions: { noServer: true },
    } as WebSocketConfig;
  }

  protected handleHasSession(clientId: string) {
    let hasSession = false;

    this.wsServer.clients.forEach(client => {
      if (path.parse(client.url).base === clientId) {
        hasSession = client.readyState === WebSocket.OPEN;
      }
    });

    return hasSession;
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
    ) as OcppProtocolVersion[];

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
        (ws as any)._url = request.url;
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

      if (!Array.isArray(rawMessage)) {
        errorResponse.description = 'Message is not an array';
        this.sendMessage(errorResponse).then(() => {
          throw new Error(
            `Received message from client with
            id ${client.id} which is not an array`
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

      if (
        this.config.schemaValidation &&
        (type === OcppMessageType.CALL || type === OcppMessageType.CALLRESULT)
      ) {
        let schema: Record<string, any>;
        let schemaType: 'request' | 'response';
        let schemaMap: Map<OcppAction, Record<string, any>>;

        switch (type) {
          case OcppMessageType.CALL:
            schemaType = 'request';
            schemaMap = this.requestSchemas;
            break;

          case OcppMessageType.CALLRESULT:
            schemaType = 'response';
            schemaMap = this.responseSchemas;
            break;
        }

        if (!schemaMap.has(action)) {
          schema = await this.loadJsonSchema(
            schemaType,
            action,
            session.protocol
          );

          schemaMap.set(action, schema);
        } else {
          schema = schemaMap.get(action);
        }

        const validation = validateJsonSchema(payload, schema);

        if (!validation.valid) {
          throw new Error(
            `Validation of JSON schema against payload of
            ${type === OcppMessageType.CALL ? 'CALL' : 'CALLRESULT'}
            message from client with id ${client.id} failed`,
            { cause: validation.errors as any }
          );
        }
      }

      const responseHandler = async (response: OutboundOcppMessage) => {
        await this.sendMessage(response);
      };

      let message: InboundOcppMessage;
      switch (type) {
        case OcppMessageType.CALL:
          message = new InboundOcppCall(
            client,
            id,
            action,
            payload,
            responseHandler
          );
          break;

        case OcppMessageType.CALLRESULT:
          message = new InboundOcppCallResult(client, id, payload);
          break;

        case OcppMessageType.CALLERROR:
          message = new InboundOcppCallError(
            client,
            id,
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

  protected async loadJsonSchema(
    type: 'request' | 'response',
    action: OcppAction,
    protocol: OcppProtocolVersion
  ) {
    let schemaDir: string;
    this.config.schemaDir.forEach((dir, protocols) => {
      if (protocols.includes(protocol)) {
        schemaDir = dir;
      }
    });

    if (!schemaDir) {
      throw new Error(
        `Missing schema directory for protocol
        ${protocol} in WebSocket endpoint config`
      );
    }

    const schemaPath = this.config.schemaPathCallback(schemaDir, type, action);

    let rawSchema: string;
    try {
      rawSchema = await (await fsPromises.readFile(schemaPath)).toString();
    } catch (err) {
      throw new Error(
        `Error while attempting to read JSON schema from file: ${schemaPath}`,
        { cause: err as any }
      );
    }

    let jsonSchema: Record<string, any>;
    try {
      jsonSchema = JSON.parse(rawSchema);
    } catch (err) {
      throw new Error('Error while attempting to parse JSON schema', {
        cause: err as any,
      });
    }

    return jsonSchema;
  }
}

export default WebSocketEndpoint;
export { WebSocketConfig };
