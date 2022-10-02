import { IncomingMessage as HttpRequest, STATUS_CODES } from 'http';
import { WebSocket, Server as WsServer, ServerOptions } from 'ws';
import path from 'path';
import { promises as fsPromises } from 'fs';
import { Duplex } from 'stream';
import { randomBytes } from 'crypto';
import { Logger } from 'ts-log';
import { oneLine, oneLineInlineLists } from 'common-tags';
import { validate as validateJsonSchema } from 'jsonschema';
import basicAuth from 'basic-auth';
import merge from 'lodash.merge';

import OcppEndpoint, { EndpointOptions } from '../common/endpoint';
import { Client, SessionService } from '../common/session';
import { InboundMessage, OutboundMessage, Payload } from '../common/message';
import { InboundCall, OutboundCall } from '../common/call';
import { InboundCallResult, OutboundCallResult } from '../common/callresult';
import { InboundCallError, OutboundCallError } from '../common/callerror';
import ProtocolVersion, { ProtocolVersions } from '../types/ocpp/version';
import MessageType from '../types/ocpp/type';
import OcppAction from '../types/ocpp/action';
import {
  InboundMessageHandler,
  AuthenticationHandler,
  AuthenticationRequest,
  OutboundMessageHandler,
} from '../common/handler';

type WsOptions = EndpointOptions & {
  wsServerOptions?: ServerOptions;
  route?: string;
  protocols?: Readonly<ProtocolVersion[]>;
  basicAuth?: boolean;
  certificateAuth?: boolean;
  schemaValidation?: boolean;
  schemaDir?: Map<ProtocolVersion[], string>;
};

class WsEndpoint extends OcppEndpoint<WsOptions> {
  protected wsServer: WsServer;
  protected requestSchemas: Map<OcppAction, Record<string, any>>;
  protected responseSchemas: Map<OcppAction, Record<string, any>>;

  constructor(
    options: WsOptions,
    authenticationHandlers: AuthenticationHandler[],
    inboundMessageHandlers: InboundMessageHandler[],
    outboundMessageHandlers?: OutboundMessageHandler[],
    sessionService?: SessionService,
    logger?: Logger
  ) {
    super(
      options,
      authenticationHandlers,
      inboundMessageHandlers,
      outboundMessageHandlers,
      sessionService,
      logger
    );
    this.wsServer = new WsServer(this.options.wsServerOptions);
    this.httpServer.on('upgrade', this.onHttpUpgrade);
    this.wsServer.on('connection', this.onWsConnected);

    this.requestSchemas = new Map();
    this.responseSchemas = new Map();
  }

  protected get defaultOptions() {
    const schemaBase = path.join(__dirname, '../../../var/jsonschema');

    const options: WsOptions = {
      route: 'ocpp',
      protocols: ProtocolVersions,
      basicAuth: true,
      certificateAuth: true,
      schemaValidation: true,
      schemaDir: new Map([
        // OCPP <= 1.6    /var/jsonschema/ocpp1.6
        [['ocpp1.2', 'ocpp1.5', 'ocpp1.6'], path.join(schemaBase, 'ocpp1.6')],
        // OCPP >= 2.0    /var/jsonschema/ocpp2.0.1
        [['ocpp2.0', 'ocpp2.0.1'], path.join(schemaBase, 'ocpp2.0.1')],
      ]),
      wsServerOptions: { noServer: true },
    };

    return merge(super.defaultOptions, options);
  }

  protected get sendMessageHandler() {
    const handleSend = async (message: OutboundMessage) => {
      const ws = this.getSocket(message.recipient.id);
      const session = await this.sessionService.get(message.recipient.id);

      const messageArr: any[] = [message.type, message.id];
      if (message instanceof OutboundCall) {
        messageArr.push(message.action, message.data);
      } else if (message instanceof OutboundCallResult) {
        messageArr.push(message.data);
      } else if (message instanceof OutboundCallError) {
        messageArr.push(message.code, message.description, message.details);
      }

      if (
        this.options.schemaValidation &&
        (message instanceof OutboundCall ||
          message instanceof OutboundCallResult)
      ) {
        const dateToString = (key: string, value: string) => value;
        const rawData = JSON.parse(JSON.stringify(message.data), dateToString);

        const messageValidation = await this.validateSchema(
          message.type,
          message.action || session.pendingInboundMessage.action,
          rawData,
          ws.protocol as ProtocolVersion
        );

        if (!messageValidation?.valid) {
          this.logger.warn(
            oneLine`Outbound ${MessageType[message.type]}
            message payload is not valid`
          );
          this.logger.trace(messageValidation.errors);
          return;
        } else {
          this.logger.debug(
            `Outbound ${MessageType[message.type]} message payload is valid`
          );
        }
      }

      ws.send(JSON.stringify(messageArr));
    };

    return new (class extends OutboundMessageHandler {
      async handle(message: OutboundMessage) {
        await handleSend(message);
        return await super.handle(message);
      }
    })() as OutboundMessageHandler;
  }

  public hasSession(clientId: string) {
    return this.getSocket(clientId)?.readyState === WebSocket.OPEN;
  }

  public async dropSession(
    clientId: string,
    force = false,
    code = 1000,
    data?: string | Buffer
  ) {
    const ws = this.getSocket(clientId);

    if (force) {
      ws.terminate();
    } else {
      ws.close(code, data);
    }

    this.onSessionClosed(clientId);
  }

  protected getSocket(clientId: string) {
    let socket: WebSocket;
    this.wsServer.clients.forEach(ws => {
      if (path.parse(ws.url).base === clientId) {
        socket = ws;
      }
    });

    return socket;
  }

  protected onHttpUpgrade = (
    request: HttpRequest,
    socket: Duplex,
    head: Buffer
  ) => {
    let error;
    let requestProperties;

    try {
      requestProperties = this.parseUpgradeRequest(request);
    } catch (err) {
      error = err as any as Error;
    }

    const { id, password, protocols } = requestProperties;

    const authRequest = new (class extends AuthenticationRequest {
      client = new Client(id);
      protocols = protocols;
      password = password ?? undefined;

      accept(protocol = this.protocols[0]) {
        super.accept(protocol);
        onAccept(protocol);
      }

      reject(status = 401) {
        super.reject();
        onReject(status);
      }
    })();

    const onAccept = async (protocol: ProtocolVersion) => {
      this.logger.debug(
        `Upgrading WebSocket connection with subprotocol: ${protocol}`
      );

      await this.onAuthenticationSuccess(authRequest);

      this.wsServer.handleUpgrade(request, socket, head, ws => {
        (ws as any)._url = request.url;

        ws.on('close', (code, reason) =>
          this.onWsDisconnected(ws, code, reason)
        );

        this.wsServer.emit('connection', ws, request, authRequest.client);
      });
    };

    const onReject = (status: number) => {
      this.logger.debug(
        oneLine`Rejecting upgrade request with
        status: ${status} ${STATUS_CODES[status]}`
      );

      this.onAuthenticationFailure(authRequest);

      socket.write(`HTTP/1.1 ${status} ${STATUS_CODES[status]}\r\n\r\n`);
      socket.destroy();
    };

    if (error) {
      this.logger.warn('Error while parsing HTTP(S) upgrade request');
      this.logger.trace(error.stack);
      authRequest.reject(400);
    }

    this.onAuthenticationAttempt(authRequest);
  };

  protected parseUpgradeRequest(request: HttpRequest) {
    const requestPath = path.parse(request.url);
    const clientId = requestPath.base;

    const basicCredentials = this.options.basicAuth
      ? basicAuth(request)
      : undefined;

    const clientProtocols =
      request.headers['sec-websocket-protocol']?.split(',');

    const supportedProtocols = this.options.protocols.filter(protocol =>
      clientProtocols?.includes(protocol)
    ) as ProtocolVersion[];

    const trimSlashesRegex = /^\/+|\/+$/g;
    if (
      requestPath.dir.replaceAll(trimSlashesRegex, '') !==
      this.options.route.replaceAll(trimSlashesRegex, '')
    ) {
      throw new Error(
        oneLine`Client with id ${clientId} attempted
        authentication on invalid route: ${request.url}`
      );
    } else if (!clientProtocols) {
      throw new Error(
        oneLine`Client with id ${clientId} attempted authentication
        without specifying any WebSocket subprotocol`
      );
    } else if (supportedProtocols.length === 0) {
      throw new Error(
        oneLineInlineLists`Client with id ${clientId}
        attempted authentication with unsupported WebSocket
        subprotocol(s): ${clientProtocols}`
      );
    } else if (this.options.basicAuth && !basicCredentials) {
      throw new Error(
        oneLine`Client with id ${clientId} attempted
        authentication without supplying BASIC credentials`
      );
    } else if (this.options.basicAuth && basicCredentials.name !== clientId) {
      throw new Error(
        oneLine`Client attempted authentication with
        mismatching ids ${clientId} in request path and
        ${basicCredentials.name} in BASIC credentials`
      );
    }

    return {
      id: clientId,
      password: basicCredentials?.pass,
      protocols: supportedProtocols,
    };
  }

  protected onWsConnected = (
    ws: WebSocket,
    request: HttpRequest,
    client: Client
  ) => {
    ws.on('message', async (data, isBinary) => {
      if (isBinary) {
        this.logger.warn(
          `Received message with binary data from client with
          id ${client.id} which is currently not supported`
        );
        this.dropSession(client.id);
        return;
      }

      let messageProperties;
      try {
        messageProperties = this.parseRawMessage(data.toString());
      } catch (err: any) {
        this.logger.warn(
          `Error while parsing message from client with id ${client.id}`
        );
        this.logger.trace(err.stack);

        const errorResponse = new OutboundCallError(
          client,
          randomBytes(16).toString('hex'),
          'ProtocolError',
          `Failed to parse message: ${err.message}`,
          null
        );

        await this.sendMessage(errorResponse);
        return;
      }

      const {
        type,
        id,
        action,
        payload,
        errorCode,
        errorDescription,
        errorDetails,
      } = messageProperties;

      if (
        this.options.schemaValidation &&
        (type === MessageType.CALL || type === MessageType.CALLRESULT)
      ) {
        const messageValidation = await this.validateSchema(
          type,
          action,
          payload,
          ws.protocol as ProtocolVersion
        );

        if (!messageValidation?.valid) {
          this.logger.warn(
            `Inbound ${MessageType[type]} message payload is not valid`
          );
          this.logger.trace(messageValidation.errors);
          return;
        } else {
          this.logger.debug(
            `Inbound ${MessageType[type]} message payload is valid`
          );
        }
      }

      const responseHandler = async (response: OutboundMessage) => {
        await this.sendMessage(response);
      };

      let message: InboundMessage;
      switch (type) {
        case MessageType.CALL:
          message = new InboundCall(
            client,
            id,
            action,
            payload,
            responseHandler
          );
          break;

        case MessageType.CALLRESULT:
          message = new InboundCallResult(client, id, payload);
          break;

        case MessageType.CALLERROR:
          message = new InboundCallError(
            client,
            id,
            errorCode,
            errorDescription,
            errorDetails
          );
          break;
      }

      this.onInboundMessage(message);
    });
  };

  protected onWsDisconnected = (
    ws: WebSocket,
    code: number,
    reason: Buffer
  ) => {
    this.onSessionClosed(path.parse(ws.url).base);
  };

  protected parseRawMessage(rawMessage: string) {
    let message: Array<any>;
    try {
      message = JSON.parse(rawMessage);
    } catch (err: any) {
      throw new Error('Invalid JSON format', { cause: err });
    }

    if (!Array.isArray(message)) {
      throw new Error('Message is not an array');
    }

    const type: number = message[0];
    if (
      typeof type !== 'number' ||
      !Object.values(MessageType).includes(type)
    ) {
      throw new Error('Missing or invalid type field');
    }

    const isCallMessage = type === MessageType.CALL;
    const isCallResultMessage = type === MessageType.CALLRESULT;
    const isCallErrorMessage = type === MessageType.CALLERROR;

    const id: string = message[1];
    if (typeof id !== 'string') {
      throw new Error('Missing or invalid id field');
    }

    const action: OcppAction = isCallMessage ? message[2] : null;
    if (isCallMessage && typeof action !== 'string') {
      throw new Error('Missing or invalid action field');
    }

    const errorCode = isCallErrorMessage ? message[2] : null;
    const errorDescription = isCallErrorMessage ? message[3] : null;
    const errorDetails = isCallErrorMessage ? message[4] : null;
    if (
      isCallErrorMessage &&
      (typeof errorCode !== 'string' || typeof errorDescription !== 'string')
    ) {
      throw new Error('Missing or invalid error code or description field');
    }

    const payload: Payload = isCallMessage
      ? message[3]
      : isCallResultMessage
      ? message[2]
      : null;

    return {
      type,
      id,
      action,
      payload,
      errorCode,
      errorDescription,
      errorDetails,
    };
  }

  protected async validateSchema(
    type: MessageType.CALL | MessageType.CALLRESULT,
    action: OcppAction,
    payload: Payload,
    protocol: ProtocolVersion
  ) {
    let schema: Record<string, any>;
    let schemaType: 'request' | 'response';
    let schemaMap: Map<OcppAction, Record<string, any>>;

    switch (type) {
      case MessageType.CALL:
        schemaType = 'request';
        schemaMap = this.requestSchemas;
        break;

      case MessageType.CALLRESULT:
        schemaType = 'response';
        schemaMap = this.responseSchemas;
        break;
    }

    if (!schemaMap.has(action)) {
      schema = await this.loadSchema(schemaType, action, protocol);
      schemaMap.set(action, schema);
    } else {
      schema = schemaMap.get(action);
    }

    return validateJsonSchema(payload, schema);
  }

  protected async loadSchema(
    type: 'request' | 'response',
    action: OcppAction,
    protocol: ProtocolVersion
  ) {
    let schemaDir: string;
    this.options.schemaDir.forEach((dir, protocols) => {
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

    const schemaPath = path.join(schemaDir, `${action}R${type.slice(1)}.json`);

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

export default WsEndpoint;
export { WsOptions };
