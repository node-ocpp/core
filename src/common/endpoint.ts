import http, { Server as HttpServer, ServerOptions } from 'http';
import https from 'https';
import { EventEmitter } from 'events';
import TypedEmitter from 'typed-emitter';
import { Logger } from 'ts-log';
import { oneLine } from 'common-tags';
import merge from 'lodash.merge';

import winstonLogger from './util/logger';
import Session, { SessionService, Client } from './session';
import LocalSessionService from './services/session-local';
import * as Handlers from './handlers';
import ProtocolVersion, { ProtocolVersions } from '../types/ocpp/version';
import OcppAction, { OcppActions } from '../types/ocpp/action';
import MessageType from '../types/ocpp/type';
import { InboundMessage, OutboundMessage } from './message';
import { OutboundCallError } from './callerror';
import {
  AsyncHandler,
  AuthenticationHandler,
  AuthenticationRequest,
  InboundMessageHandler,
  OutboundMessageHandler,
} from './handler';

type EndpointOptions = {
  port?: number;
  hostname?: string;
  https?: boolean;
  protocols?: Readonly<ProtocolVersion[]>;
  actionsAllowed?: Readonly<OcppAction[]>;
  maxConnections?: number;
  messageTimeout?: number;
  sessionTimeout?: number;
  httpServerOptions?: ServerOptions;
};

type EndpointEvents = {
  server_starting: (config: EndpointOptions) => void;
  server_listening: (config: EndpointOptions) => void;
  server_stopping: () => void;
  server_stopped: () => void;
  client_connecting: (client: Client) => void;
  client_connected: (client: Client) => void;
  client_rejected: (client: Client) => void;
  client_disconnected: (client: Client) => void;
  message_sent: (message: OutboundMessage) => void;
  message_received: (message: InboundMessage) => void;
};

abstract class OcppEndpoint<
  TConfig extends EndpointOptions
> extends (EventEmitter as new () => TypedEmitter<EndpointEvents>) {
  protected _options: TConfig;

  protected httpServer: HttpServer;
  protected sessionService: SessionService;
  protected logger: Logger;
  protected authenticationHandlers: AuthenticationHandler[];
  protected inboundMessageHandlers: InboundMessageHandler[];
  protected outboundMessageHandlers: OutboundMessageHandler[];

  protected abstract hasSession(clientId: string): boolean;
  protected abstract dropSession(clientId: string): void;
  protected abstract get sendMessageHandler(): OutboundMessageHandler;

  constructor(
    options: TConfig,
    authenticationHandlers: AuthenticationHandler[],
    inboundMessageHandlers: InboundMessageHandler[],
    outboundMessageHandlers: OutboundMessageHandler[] = [],
    sessionService: SessionService = new LocalSessionService(),
    logger: Logger = winstonLogger
  ) {
    super();
    this._options = merge(this.defaultOptions, options);

    this.httpServer = this.options.https
      ? https.createServer(this.options.httpServerOptions)
      : http.createServer(this.options.httpServerOptions);
    this.httpServer.on('error', this.onHttpError);

    this.sessionService = sessionService;
    this.sessionService.create();

    this.logger = logger;

    this.authenticationHandlers = AsyncHandler.map([
      ...this.defaultHandlers.authentication.prefix,
      ...authenticationHandlers,
      ...this.defaultHandlers.authentication.suffix,
    ]);

    this.inboundMessageHandlers = AsyncHandler.map([
      ...this.defaultHandlers.inboundMessage.prefix,
      ...inboundMessageHandlers,
      ...this.defaultHandlers.inboundMessage.suffix,
    ]);

    this.outboundMessageHandlers = AsyncHandler.map([
      ...this.defaultHandlers.outboundMessage.prefix,
      ...outboundMessageHandlers,
      ...this.defaultHandlers.outboundMessage.suffix,
    ]);
  }

  protected get defaultOptions() {
    return {
      port: process.env.NODE_ENV === 'development' ? 8080 : 80,
      hostname: 'localhost',
      protocols: ProtocolVersions,
      actionsAllowed: OcppActions,
      maxConnections: 511,
      messageTimeout: 30000,
      sessionTimeout: 60000,
      httpServerOptions: {},
    } as EndpointOptions;
  }

  protected get defaultHandlers() {
    return {
      authentication: {
        prefix: <AuthenticationHandler[]>[
          new Handlers.SessionExistsHandler(this.sessionService, this.logger),
        ],
        suffix: <AuthenticationHandler[]>[],
      },
      inboundMessage: {
        prefix: [
          new Handlers.InboundActionsAllowedHandler(this.options, this.logger),
          new Handlers.InboundMessageSynchronicityHandler(
            this.sessionService,
            this.logger
          ),
          new Handlers.InboundPendingMessageHandler(this.sessionService),
        ],
        suffix: <InboundMessageHandler[]>[],
      },
      outboundMessage: {
        prefix: [
          new Handlers.OutboundActionsAllowedHandler(this.options, this.logger),
        ],
        suffix: <OutboundMessageHandler[]>[
          this.sendMessageHandler,
          new Handlers.OutboundPendingMessageHandler(this.sessionService),
        ],
      },
    };
  }

  public get options() {
    return this._options;
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
    console.dir(process.env);
  }

  protected async sendMessage(message: OutboundMessage) {
    if (!this.isListening) {
      this.logger.warn(
        oneLine`sendMessage() was called but endpoint is
        currently not listening for connections`
      );
      this.logger.trace(new Error().stack);
      return;
    } else if (!this.hasSession(message.recipient.id)) {
      this.logger.warn(
        oneLine`sendMessage() was called but client with
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

    await this.outboundMessageHandlers[0].handle(message);
    message.setSent();

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

  protected async onAuthenticationAttempt(request: AuthenticationRequest) {
    this.logger.debug(
      `Client with id ${request.client.id} attempting authentication`
    );
    this.emit('client_connecting', request.client);

    await this.authenticationHandlers[0].handle(request);
  }

  protected onAuthenticationFailure(request: AuthenticationRequest) {
    this.logger.warn(
      `Client with id ${request.client.id} failed to authenticate`
    );
    this.emit('client_rejected', request.client);
  }

  protected async onAuthenticationSuccess(request: AuthenticationRequest) {
    if (await this.hasSession(request.client.id)) {
      this.logger.warn(
        oneLine`onAuthenticationSuccess() was called but client
        with id ${request.client.id} is already connected`
      );
      return;
    }

    const session = new Session(
      request.client,
      request.protocol,
      () => this.hasSession(request.client.id),
      () => this.dropSession(request.client.id)
    );
    await this.sessionService.add(session);

    this.logger.info(
      `Client with id ${request.client.id} authenticated successfully`
    );
    this.emit('client_connected', request.client);
  }

  protected async onSessionClosed(clientId: string) {
    if (!this.sessionService.has(clientId)) {
      this.logger.warn(
        oneLine`onSessionClosed() was called but client
        with id ${clientId}is already connected`
      );
      return;
    }

    await this.sessionService.remove(clientId);

    this.logger.info(`Client with id ${clientId} disconnected`);
    this.emit('client_disconnected', new Client(clientId));
  }

  protected async onInboundMessage(message: InboundMessage) {
    this.logger.debug(
      oneLine`Received ${MessageType[message.type]}
      message from client with id ${message.sender.id}`
    );
    this.logger.trace(message);
    this.emit('message_received', message);

    try {
      await this.inboundMessageHandlers[0].handle(message);
    } catch (err: any) {
      if (err instanceof OutboundCallError) {
        await this.sendMessage(err);
      } else {
        this.logger.error(
          `Error occured while handling inbound
          ${MessageType[message.type]} message`
        );
        this.logger.trace(err.stack);
      }
    }
  }
}

export default OcppEndpoint;
export { EndpointEvents, EndpointOptions };
