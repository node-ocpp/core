import http from 'http';
import https from 'https';
import { randomUUID } from 'crypto';
import EventEmitter from 'eventemitter3';
import { Logger } from 'ts-log';
import { oneLine } from 'common-tags';
import _ from 'lodash';

import EndpointOptions, { defaultOptions } from './options';
import defaultLogger from './util/logger';
import { HandlerChain, HandlerFunction, RequestContext } from './util/handler';
import * as Handlers from './handlers';
import Session, { SessionStorage, Client } from './session';
import OcppAction from '../types/ocpp/action';
import MessageType from '../types/ocpp/type';
import { InboundMessage, OutboundMessage } from './message';
import { InboundCall, OutboundCall } from './call';
import { OutboundCallError } from './callerror';
import { CallPayload, CallResponsePayload } from '../types/ocpp/util';
import AuthHandler, { AcceptanceState, AuthRequest } from './auth';
import { InboundMessageHandler, OutboundMessageHandler } from './handler';

interface Endpoint extends EventEmitter<EndpointEvents> {
  options: EndpointOptions;
  isListening: boolean;

  listen(): void;
  stop(): void;
  drop(clientId: string, force: boolean): void;
  isConnected(clientId: string): boolean;

  handle<TRequest extends InboundCall>(
    action: OcppAction,
    callback: (
      data: CallPayload<TRequest>
    ) => Promise<CallResponsePayload<TRequest>>
  ): void;

  send<TRequest extends OutboundCall>(
    recipient: string,
    action: OcppAction,
    data: CallPayload<TRequest>,
    id?: string
  ): Promise<CallResponsePayload<TRequest>>;
}

type EndpointEvents = {
  server_starting: (options: EndpointOptions) => void;
  server_listening: (options: EndpointOptions) => void;
  server_stopping: () => void;
  server_stopped: () => void;
  client_connecting: (request: AuthRequest) => void;
  client_accepted: (request: AuthRequest) => void;
  client_rejected: (request: AuthRequest) => void;
  client_connected: (session: Session) => void;
  client_disconnected: (session: Session) => void;
  message_sent: (message: OutboundMessage) => void;
  message_received: (message: InboundMessage) => void;
};

abstract class BaseEndpoint
  extends EventEmitter<EndpointEvents>
  implements Endpoint
{
  readonly options: EndpointOptions;

  protected httpServer: http.Server;
  protected sessionStorage: SessionStorage;
  protected logger: Logger;

  protected authHandlers: HandlerChain<AuthHandler>;
  protected inboundHandlers: HandlerChain<InboundMessageHandler>;
  protected outboundHandlers: HandlerChain<OutboundMessageHandler>;

  abstract isConnected(clientId: string): boolean;
  abstract drop(clientId: string, force: boolean): void;
  protected abstract handleSend: HandlerFunction<OutboundMessage>;

  constructor(
    options: EndpointOptions,
    authHandlers: AuthHandler[] = [],
    inboundHandlers: InboundMessageHandler[] = [],
    outboundHandlers: OutboundMessageHandler[] = [],
    httpServer = http.createServer(),
    logger: Logger = defaultLogger,
    sessionStorage: SessionStorage = new Map()
  ) {
    super();
    this.logger = logger;

    this.options = _.merge(defaultOptions, options);

    if (!this.options.authRequired) {
      this.logger.warn(
        oneLine`options.authRequired is set to false,
        authentication attempts will be accepted by default`
      );
    }
    if (this.options.certificateAuth && !(httpServer instanceof https.Server)) {
      this.logger.error(
        oneLine`options.certificateAuth is set to
        true but no https.Server instance was passed`
      );
    }
    this.logger.debug('Loaded endpoint configuration');
    this.logger.trace(this.options);

    this.httpServer = httpServer;
    this.httpServer.on('error', this.onHttpError);

    this.sessionStorage = sessionStorage;

    this.authHandlers = new HandlerChain(
      new Handlers.SessionExistsHandler(),
      new Handlers.SessionTimeoutHandler(),
      ...authHandlers,
      new Handlers.DefaultAuthHandler()
    );
    this.logger.debug(`Loaded ${this.authHandlers.size} auth handlers`);
    this.logger.trace(this.authHandlers.toString());

    this.inboundHandlers = new HandlerChain(
      new Handlers.InboundMessageSynchronicityHandler(sessionStorage, logger),
      new Handlers.InboundPendingMessageHandler(sessionStorage),
      new Handlers.InboundActionsAllowedHandler(this.options, logger),
      ...inboundHandlers,
      new Handlers.DefaultMessageHandler(logger)
    );
    this.logger.debug(`Loaded ${this.inboundHandlers.size} inbound handlers`);
    this.logger.trace(this.inboundHandlers.toString());

    this.outboundHandlers = new HandlerChain(
      new Handlers.OutboundMessageSynchronicityHandler(sessionStorage, logger),
      new Handlers.OutboundActionsAllowedHandler(this.options, logger),
      ...outboundHandlers,
      async (message: OutboundMessage) => await this.handleSend(message),
      new Handlers.OutboundPendingMessageHandler(sessionStorage)
    );
    this.logger.debug(`Loaded ${this.outboundHandlers.size} outbound handlers`);
    this.logger.trace(this.outboundHandlers.toString());
  }

  public get isListening() {
    return this.httpServer.listening;
  }

  public listen() {
    if (this.isListening) {
      this.logger.warn(
        'listen() was called but endpoint is already listening for connections'
      );
      this.logger.trace(new Error().stack);
      return;
    }

    this.logger.info('Starting endpoint', this.options);
    this.emit('server_starting', this.options);

    this.httpServer.listen(
      this.options.port,
      this.options.hostname,
      this.options.maxConnections,
      () => {
        this.logger.info(
          `Endpoint is listening on port ${this.options.port}`,
          this.options
        );
        this.emit('server_listening', this.options);
      }
    );
  }

  public stop() {
    if (!this.isListening) {
      this.logger.warn(
        oneLine`stop() was called but endpoint is
        currently not listening for connections`
      );
      this.logger.trace(new Error().stack);
      return;
    }

    this.logger.info('Stopping endpoint');
    this.emit('server_stopping');

    this.httpServer.close(err => {
      if (err) {
        this.logger.error('Error while stopping HTTP(S) server');
        this.logger.trace(err.stack);
      } else {
        this.logger.info('Stopped endpoint');
        this.emit('server_stopped');
      }
    });
  }

  public handle<TRequest extends InboundCall>(
    action: OcppAction,
    callback: (
      data: CallPayload<TRequest>
    ) => Promise<CallResponsePayload<TRequest>>
  ) {
    const handler = new Handlers.ActionHandler(action, callback);
    this.inboundHandlers.add(handler, this.inboundHandlers.size - 2);
  }

  public async send<TRequest extends OutboundCall>(
    recipient: string,
    action: OcppAction,
    data: CallPayload<TRequest>,
    id: string = randomUUID()
  ): Promise<CallResponsePayload<TRequest>> {
    const message = new OutboundCall(new Client(recipient), id, action, data);
    await this.onSend(message);

    return new Promise((resolve, reject) => {
      const callback = async (data: CallPayload<TRequest>) => {
        this.inboundHandlers.remove(handler);
        resolve(data as CallResponsePayload<TRequest>);
      };

      const handler = new Handlers.IdHandler(id, callback);
      this.inboundHandlers.add(handler, this.inboundHandlers.size - 2);
    });
  }

  protected async onSend(message: OutboundMessage) {
    if (!this.isListening) {
      this.logger.warn(
        oneLine`onSend() was called but endpoint is
        currently not listening for connections`
      );
      this.logger.trace(new Error().stack);
      return;
    }

    if (!this.isConnected(message.recipient.id)) {
      this.logger.warn(
        oneLine`onSend() was called but client with
        id ${message.recipient.id} is not connected`
      );
      this.logger.trace(new Error().stack);
      return;
    }

    this.logger.debug(
      oneLine`Sending ${MessageType[message.type]}
      to client with id ${message.recipient.id}`
    );
    this.logger.trace(message);

    await this.outboundHandlers.handle(message);

    this.logger.debug(
      oneLine`${MessageType[message.type]} message to
      client with id ${message.recipient.id} was sent`
    );
    this.emit('message_sent', message);
  }

  protected onHttpError = (err: Error) => {
    this.logger.error('Error occured in HTTP(S) server');
    this.logger.trace(err.stack);
  };

  protected onAuthRequest(request: AuthRequest) {
    this.logger.debug(
      `Client with id ${request.client.id} attempting authentication`
    );
    this.emit('client_connecting', request);

    this.authHandlers.handle(request).then(result => {
      switch (result.state) {
        case AcceptanceState.Rejected:
          this.onAuthFailure(request);
          break;
        case AcceptanceState.Accepted:
          this.onAuthSuccess(request);
          break;
        case AcceptanceState.Pending:
        default:
          this.logger.warn(
            oneLine`Authentication request from client with
            id ${request.client.id} has not been handled`
          );
      }
    });
  }

  protected onAuthFailure(request: AuthRequest) {
    const socket = request.req.socket;
    const status = request.statusCode;
    socket.write(`HTTP/1.1 ${status} ${http.STATUS_CODES[status]}\r\n\r\n`);
    socket.destroy();

    this.logger.warn(
      oneLine`Rejecting authentication request from client with id
      ${request.client.id} with status: ${status} ${http.STATUS_CODES[status]}`
    );
    this.emit('client_rejected', request);
  }

  protected onAuthSuccess(request: AuthRequest) {
    if (this.isConnected(request.client.id)) {
      this.logger.warn(
        oneLine`onAuthenticationSuccess() was called but client
        with id ${request.client.id} is already connected`
      );
      return;
    }

    const session = new Session(request.client, request.protocol);
    this.sessionStorage.set(request.client.id, session);

    this.emit('client_accepted', request);
    this.logger.info(
      `Client with id ${request.client.id} authenticated successfully`
    );
    this.emit('client_connected', session);
  }

  protected async onSessionClosed(clientId: string) {
    if (!this.sessionStorage.delete(clientId)) {
      this.logger.error(
        oneLine`onSessionClosed() was called but session for client
        with id ${clientId} does not exist`
      );
      this.logger.trace(new Error().stack);
      return;
    }

    this.logger.info(`Client with id ${clientId} disconnected`);
    this.emit('client_disconnected', this.sessionStorage.get(clientId));
  }

  protected async onInboundMessage(message: InboundMessage) {
    this.logger.debug(
      oneLine`Received ${MessageType[message.type]}
      message from client with id ${message.sender.id}`
    );
    this.logger.trace(message);
    this.emit('message_received', message);

    try {
      await this.inboundHandlers.handle(message);
    } catch (err: any) {
      if (err instanceof OutboundCallError) {
        await this.onSend(err);
      } else {
        this.logger.error(
          `Error occured while handling inbound
          ${MessageType[message.type]} message`
        );
        this.logger.trace(err.stack);
      }
    }
  }

  protected get context(): RequestContext {
    return {
      endpoint: this,
      logger: this.logger,
      sessions: this.sessionStorage,
    };
  }
}

export default BaseEndpoint;
export { Endpoint, EndpointEvents };
