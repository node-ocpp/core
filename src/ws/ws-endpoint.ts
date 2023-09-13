import http from 'http';
import { WebSocket } from 'ws';
import * as ws from 'ws';
import path from 'path';
import { Duplex } from 'stream';
import { randomBytes } from 'crypto';
import { Logger } from 'ts-log';
import { oneLine, oneLineInlineLists } from 'common-tags';

import BaseEndpoint from '../common/endpoint';
import EndpointOptions from '../common/options';
import { Client, SessionStorage } from '../common/session';
import { InboundMessage, OutboundMessage, Payload } from '../common/message';
import { InboundCall, OutboundCall } from '../common/call';
import { InboundCallResult, OutboundCallResult } from '../common/callresult';
import { InboundCallError, OutboundCallError } from '../common/callerror';
import ProtocolVersion from '../types/ocpp/version';
import MessageType from '../types/ocpp/type';
import OcppAction from '../types/ocpp/action';
import AuthHandler, { AuthRequest } from '../common/auth';
import {
  InboundMessageHandler,
  OutboundMessageHandler,
} from '../common/handler';
import WsValidator from './ws-validator';

class WsEndpoint extends BaseEndpoint {
  protected wsServer: ws.Server;
  protected validator: WsValidator;

  constructor(
    options?: EndpointOptions,
    authHandlers?: AuthHandler[],
    inboundHandlers?: InboundMessageHandler[],
    outboundHandlers?: OutboundMessageHandler[],
    httpServer?: http.Server,
    logger?: Logger,
    sessionStorage?: SessionStorage,
    validator: WsValidator = new WsValidator()
  ) {
    super(
      options,
      authHandlers,
      inboundHandlers,
      outboundHandlers,
      httpServer,
      logger,
      sessionStorage
    );

    this.wsServer = new ws.Server({ noServer: true });
    this.validator = validator;

    this.httpServer.on('upgrade', this.onHttpUpgrade);
    this.wsServer.on('connection', this.onWsConnected);
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
  }

  protected handleSend = async (message: OutboundMessage) => {
    const ws = this.getSocket(message.recipient.id);
    const session = await this.sessionStorage.get(message.recipient.id);

    const messageArr: any[] = [message.type, message.id];
    if (message instanceof OutboundCall) {
      messageArr.push(message.action, message.data);
    } else if (message instanceof OutboundCallResult) {
      messageArr.push(message.data);
    } else if (message instanceof OutboundCallError) {
      messageArr.push(message.code, message.description, message.details);
    }

    if (
      this.options.validation &&
      (message instanceof OutboundCall || message instanceof OutboundCallResult)
    ) {
      const dateToString = (key: string, value: string) => value;
      const rawData = JSON.parse(JSON.stringify(message.data), dateToString);

      const messageValidation = await this.validator.validate(
        message.type,
        message.action || session.pendingInboundMessage.action,
        rawData,
        ws.protocol as ProtocolVersion
      );

      if (!messageValidation?.valid) {
        return;
      }
    }

    return new Promise<OutboundMessage>((resolve, reject) => {
      ws.send(JSON.stringify(messageArr), err => {
        if (err) {
          reject(err);
        } else {
          resolve(message);
        }
      });
    });
  };

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
    request: http.IncomingMessage,
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
        status: ${status} ${http.STATUS_CODES[status]}`
      );

      this.onAuthenticationFailure(authRequest);

      socket.write(`HTTP/1.1 ${status} ${http.STATUS_CODES[status]}\r\n\r\n`);
      socket.destroy();
    };

    if (error) {
      this.logger.warn('Error while parsing HTTP(S) upgrade request');
      this.logger.trace(error.stack);
      authRequest.reject(400);
    }

    this.onAuthenticationAttempt(authRequest);
  };

  protected parseUpgradeRequest(request: http.IncomingMessage) {
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
    request: http.IncomingMessage,
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
          `Error while parsing message from client
          with id ${client.id}: ${err.message}`
        );
        this.logger.trace(err.stack);

        const errorResponse = new OutboundCallError(
          client,
          randomBytes(16).toString('hex'),
          'ProtocolError',
          `Failed to parse message: ${err.message}`,
          null
        );

        await this.onSend(errorResponse);
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
        this.options.validation &&
        (type === MessageType.CALL || type === MessageType.CALLRESULT)
      ) {
        const session = await this.sessionStorage.get(client.id);
        const lastOutboundCall = session?.lastOutboundMessage as OutboundCall;

        const messageValidation = await this.validator.validate(
          type,
          action || lastOutboundCall.action,
          payload,
          ws.protocol as ProtocolVersion
        );

        if (!messageValidation?.valid) {
          return;
        }
      }

      const responseHandler = async (response: OutboundMessage) => {
        await this.onSend(response);
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
    this.logger.debug(`WebSocket connection closed with reason: ${code}`);
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
}

export default WsEndpoint;
