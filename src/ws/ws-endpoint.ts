import http from 'http';
import * as ws from 'ws';
import path from 'path';
import { Duplex } from 'stream';
import { randomBytes } from 'crypto';
import { Logger } from 'ts-log';
import { oneLine, oneLineInlineLists } from 'common-tags';

import BaseEndpoint from '../common/endpoint';
import EndpointOptions from '../common/options';
import { Client } from '../common/session';
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
  readonly sockets: Map<string, ws.WebSocket>;
  protected wsServer: ws.Server;
  protected validator: WsValidator;

  constructor(
    options?: EndpointOptions,
    authHandlers?: AuthHandler[],
    inboundHandlers?: InboundMessageHandler[],
    outboundHandlers?: OutboundMessageHandler[],
    logger?: Logger,
    httpServer?: http.Server,
    validator: WsValidator = new WsValidator()
  ) {
    super(
      options,
      authHandlers,
      inboundHandlers,
      outboundHandlers,
      logger,
      httpServer
    );

    this.sockets = new Map();
    this.wsServer = new ws.Server({ noServer: true });
    this.validator = validator;

    this.httpServer.on('upgrade', this.onHttpUpgrade);
    this.wsServer.on('connection', this.onWsConnected);
    this.wsServer.shouldHandle = req => req.url.startsWith(this.options.route);
  }

  public isConnected(clientId: string) {
    return this.sockets.get(clientId)?.readyState === ws.WebSocket.OPEN;
  }

  public async drop(
    clientId: string,
    force = false,
    code = 1000,
    data?: string | Buffer
  ) {
    const ws = this.sockets.get(clientId);

    if (!ws) {
      this.logger.warn(`drop() was called with invalid client id ${clientId}`);
      return;
    }

    if (force) {
      ws.terminate();
    } else {
      ws.close(code, data);
    }
  }

  protected handleSend = async (message: OutboundMessage) => {
    const ws = this.sockets.get(message.recipient.id);
    const session = this.sessions.get(message.recipient.id);

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
      const rawData = JSON.parse(JSON.stringify(message.data), (k, v) => v);

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

  protected onHttpUpgrade = (
    req: http.IncomingMessage,
    socket: Duplex,
    head: Buffer
  ) => {
    const clientId = path.basename(req.url);
    const clientProtocols = req.headers['sec-websocket-protocol']?.split(',');
    const supportedProtocols = this.options.protocols.filter(
      protocol => clientProtocols?.includes(protocol)
    ) as ProtocolVersion[];
    const authRequest = new AuthRequest(
      this.context,
      clientId,
      supportedProtocols[0],
      req
    );

    if (!clientProtocols) {
      this.logger.warn(
        oneLine`Client with id ${clientId} attempted authentication
        without specifying any WebSocket subprotocol`
      );
      authRequest.reject(400);
      this.onAuthFailure(authRequest);
      return;
    }

    if (supportedProtocols.length === 0) {
      this.logger.warn(
        oneLineInlineLists`Client with id ${clientId}
        attempted authentication with unsupported
        subprotocol(s): ${clientProtocols}`
      );
      authRequest.reject(400);
      this.onAuthFailure(authRequest);
      return;
    }

    const listener = (request: AuthRequest) => {
      if (request.client.id === clientId) {
        this.logger.debug(
          oneLine`Upgrading WebSocket connection
          with protocol ${supportedProtocols[0]}`
        );

        this.wsServer.handleUpgrade(req, socket, head, ws => {
          ws.on('close', (code, reason) =>
            this.onWsDisconnected(clientId, code, reason)
          );

          this.sockets.set(clientId, ws);
          this.wsServer.emit('connection', ws, req, authRequest.client);
        });

        this.removeListener('client_accepted', listener);
      }
    };

    this.on('client_accepted', listener);
    this.onAuthRequest(authRequest);
  };

  protected onWsConnected = (
    ws: ws.WebSocket,
    req: http.IncomingMessage,
    client: Client
  ) => {
    ws.on('message', async (data, isBinary) => {
      if (isBinary) {
        this.logger.warn(
          `Received message with binary data from client with
          id ${client.id} which is currently not supported`
        );
        this.drop(client.id);
        return;
      }

      let messageProperties;
      try {
        messageProperties = this.parseMessage(data.toString());
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
        const session = this.sessions.get(client.id);
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
    clientId: string,
    code: number,
    reason: Buffer
  ) => {
    this.logger.debug(
      `WebSocket connection closed with reason: ${code} ${reason}`
    );
    this.onSessionClosed(clientId);
  };

  protected parseMessage(rawMessage: string) {
    let message: Array<Payload>;
    try {
      message = JSON.parse(rawMessage);
    } catch (err) {
      throw new Error('Invalid JSON format', { cause: err as Error });
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
