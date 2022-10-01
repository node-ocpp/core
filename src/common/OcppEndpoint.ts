import https, {
  Server as HTTPSServer,
  ServerOptions as HTTPSOptions,
} from 'https';

import http, { Server as HTTPServer, ServerOptions as HTTPOptions } from 'http';
import { EventEmitter } from 'events';
import TypedEmitter from 'typed-emitter';
import { Logger } from 'ts-log';
import { oneLine } from 'common-tags';
import merge from 'lodash.merge';

import winstonLogger from './util/Logger';
import OcppSession, { OcppClient, OcppSessionService } from './OcppSession';
import LocalSessionService from './services/LocalSessionService';
import OcppMessageType from '../types/ocpp/OcppMessageType';
import { InboundOcppMessage, OutboundOcppMessage } from './OcppMessage';
import { OutboundOcppCallError } from './OcppCallErrorMessage';
import OcppAction, { OcppActions } from '../types/ocpp/OcppAction';
import * as Handlers from './handlers';

import OcppProtocolVersion, {
  OcppProtocolVersions,
} from '../types/ocpp/OcppProtocolVersion';

import {
  AsyncHandler,
  OcppAuthenticationHandler,
  OcppAuthenticationRequest,
  InboundOcppMessageHandler,
  OutboundOcppMessageHandler,
} from './OcppHandlers';

type OcppEndpointConfig = {
  port?: number;
  hostname?: string;
  https?: boolean;
  httpOptions?: HTTPOptions | HTTPSOptions;
  protocols?: Readonly<OcppProtocolVersion[]>;
  actionsAllowed?: Readonly<OcppAction[]>;
  maxConnections?: number;
  messageTimeout?: number;
  sessionTimeout?: number;
};

type OcppEndpointEvents = {
  server_starting: (config: OcppEndpointConfig) => void;
  server_listening: (config: OcppEndpointConfig) => void;
  server_stopping: () => void;
  server_stopped: () => void;
  client_connecting: (client: OcppClient) => void;
  client_connected: (client: OcppClient) => void;
  client_rejected: (client: OcppClient) => void;
  client_disconnected: (client: OcppClient) => void;
  message_sent: (message: OutboundOcppMessage) => void;
  message_received: (message: InboundOcppMessage) => void;
};

abstract class OcppEndpoint<
  TConfig extends OcppEndpointConfig
> extends (EventEmitter as new () => TypedEmitter<OcppEndpointEvents>) {
  protected _config: TConfig;

  protected httpServer: HTTPServer | HTTPSServer;
  protected sessionService: OcppSessionService;
  protected logger: Logger;
  protected authenticationHandlers: OcppAuthenticationHandler[];
  protected inboundMessageHandlers: InboundOcppMessageHandler[];
  protected outboundMessageHandlers: OutboundOcppMessageHandler[];

  protected abstract hasSession(clientId: string): boolean;
  protected abstract dropSession(clientId: string): void;
  protected abstract get sendMessageHandler(): OutboundOcppMessageHandler;

  constructor(
    config: TConfig,
    authenticationHandlers: OcppAuthenticationHandler[],
    inboundMessageHandlers: InboundOcppMessageHandler[],
    outboundMessageHandlers: OutboundOcppMessageHandler[] = [],
    sessionService: OcppSessionService = new LocalSessionService(),
    logger: Logger = winstonLogger
  ) {
    super();
    this._config = merge(this.defaultConfig, config);

    this.httpServer = this.config.https
      ? https.createServer(this.config.httpOptions)
      : http.createServer(this.config.httpOptions);
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

  protected get defaultHttpOptions() {
    return {} as HTTPOptions;
  }

  protected get defaultConfig() {
    return {
      port: process.env.NODE_ENV === 'development' ? 8080 : 80,
      hostname: 'localhost',
      httpOptions: this.defaultHttpOptions,
      protocols: OcppProtocolVersions,
      actionsAllowed: OcppActions,
      maxConnections: 511,
      messageTimeout: 30000,
      sessionTimeout: 60000,
    } as OcppEndpointConfig;
  }

  protected get defaultHandlers() {
    return {
      authentication: {
        prefix: <OcppAuthenticationHandler[]>[
          new Handlers.SessionExistsHandler(this.sessionService, this.logger),
        ],
        suffix: <OcppAuthenticationHandler[]>[],
      },
      inboundMessage: {
        prefix: [
          new Handlers.InboundActionsAllowedHandler(this.config, this.logger),
          new Handlers.InboundMessageSynchronicityHandler(
            this.sessionService,
            this.logger
          ),
          new Handlers.InboundPendingMessageHandler(this.sessionService),
        ],
        suffix: <InboundOcppMessageHandler[]>[],
      },
      outboundMessage: {
        prefix: [
          new Handlers.OutboundActionsAllowedHandler(this.config, this.logger),
        ],
        suffix: <OutboundOcppMessageHandler[]>[
          this.sendMessageHandler,
          new Handlers.OutboundPendingMessageHandler(this.sessionService),
        ],
      },
    };
  }

  public get config() {
    return this._config;
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

    this.logger.info('Starting endpoint', this.config);
    this.emit('server_starting', this.config);

    this.httpServer.listen(
      this.config.port,
      this.config.hostname,
      this.config.maxConnections,
      () => {
        this.logger.info(
          `Endpoint is listening on port ${this.config.port}`,
          this.config
        );
        this.emit('server_listening', this.config);
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

  protected async sendMessage(message: OutboundOcppMessage) {
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
      oneLine`Sending ${OcppMessageType[message.type]}
      to client with id ${message.recipient.id}`
    );
    this.logger.trace(message);

    await this.outboundMessageHandlers[0].handle(message);
    message.setSent();

    this.logger.debug(
      oneLine`${OcppMessageType[message.type]} message to
      client with id ${message.recipient.id} was sent`
    );
    this.emit('message_sent', message);
  }

  protected onHttpError = (err: Error) => {
    this.logger.error('Error occured in HTTP(S) server');
    this.logger.trace(err.stack);
  };

  protected async onAuthenticationAttempt(request: OcppAuthenticationRequest) {
    this.logger.debug(
      `Client with id ${request.client.id} attempting authentication`
    );
    this.emit('client_connecting', request.client);

    await this.authenticationHandlers[0].handle(request);
  }

  protected onAuthenticationFailure(request: OcppAuthenticationRequest) {
    this.logger.warn(
      `Client with id ${request.client.id} failed to authenticate`
    );
    this.emit('client_rejected', request.client);
  }

  protected async onAuthenticationSuccess(request: OcppAuthenticationRequest) {
    if (await this.hasSession(request.client.id)) {
      this.logger.warn(
        oneLine`onAuthenticationSuccess() was called but client
        with id ${request.client.id} is already connected`
      );
      return;
    }

    const session = new OcppSession(
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
    this.emit('client_disconnected', new OcppClient(clientId));
  }

  protected async onInboundMessage(message: InboundOcppMessage) {
    this.logger.debug(
      oneLine`Received ${OcppMessageType[message.type]}
      message from client with id ${message.sender.id}`
    );
    this.logger.trace(message);
    this.emit('message_received', message);

    try {
      await this.inboundMessageHandlers[0].handle(message);
    } catch (err: any) {
      if (err instanceof OutboundOcppCallError) {
        await this.sendMessage(err);
      } else {
        this.logger.error(
          `Error occured while handling inbound
          ${OcppMessageType[message.type]} message`
        );
        this.logger.trace(err.stack);
      }
    }
  }
}

export default OcppEndpoint;
export { OcppEndpointEvents, OcppEndpointConfig };
