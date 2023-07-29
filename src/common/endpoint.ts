import http, { Server as HttpServer, ServerOptions } from 'http';
import https from 'https';
import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';
import TypedEmitter from 'typed-emitter';
import { Logger } from 'ts-log';
import { oneLine } from 'common-tags';
import merge from 'lodash.merge';

import winstonLogger from './util/logger';
import Session, { SessionStorage, Client } from './session';
import LocalSessionStorage from './services/session-local';
import ProtocolVersion, { ProtocolVersions } from '../types/ocpp/version';
import OcppAction, { OcppActions } from '../types/ocpp/action';
import MessageType from '../types/ocpp/type';
import { InboundMessage, OutboundMessage } from './message';
import { InboundCall, OutboundCall } from './call';
import { OutboundCallError } from './callerror';
import * as Handlers from './handlers';
import {
  BaseHandler,
  AuthenticationHandler,
  AuthenticationRequest,
  InboundMessageHandler,
  OutboundMessageHandler,
} from './handler';
import { CallPayload, CallResponsePayload } from '../types/ocpp/util';

type EndpointOptions = {
  port?: number;
  hostname?: string;
  https?: boolean;
  protocols?: Readonly<ProtocolVersion[]>;
  actionsAllowed?: Readonly<OcppAction[]>;
  maxConnections?: number;
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
  protected sessionStorage: SessionStorage;
  protected logger: Logger;
  protected authenticationHandlers: AuthenticationHandler[];
  protected inboundMessageHandlers: InboundMessageHandler[];
  protected outboundMessageHandlers: OutboundMessageHandler[];

  protected abstract hasSession(clientId: string): boolean;
  protected abstract dropSession(clientId: string, force: boolean): void;
  protected abstract get sendMessageHandler(): OutboundMessageHandler;

  constructor(
    options: TConfig,
    authenticationHandlers: AuthenticationHandler[],
    inboundMessageHandlers: InboundMessageHandler[],
    outboundMessageHandlers: OutboundMessageHandler[] = [],
    sessionStorage: SessionStorage = new LocalSessionStorage(),
    logger: Logger = winstonLogger
  ) {
    super();
    this.logger = logger;

    this._options = merge(this.defaultOptions, options);
    this.logger.debug('Loaded endpoint configuration');
    this.logger.trace(this._options);

    this.httpServer = this.options.https
      ? https.createServer(this.options.httpServerOptions)
      : http.createServer(this.options.httpServerOptions);
    this.httpServer.on('error', this.onHttpError);
    this.logger.debug('Created HTTP(S) server instance');

    this.sessionStorage = sessionStorage;

    this.authenticationHandlers = BaseHandler.map([
      ...this.defaultHandlers.authentication.prefix,
      ...authenticationHandlers,
      ...this.defaultHandlers.authentication.suffix,
    ]);
    this.logger.debug(
      `Loaded ${this.authenticationHandlers.length} authentication handlers`
    );
    this.logger.trace({
      ...this.authenticationHandlers.map(handler => handler.constructor.name),
    });

    this.inboundMessageHandlers = BaseHandler.map([
      ...this.defaultHandlers.inboundMessage.prefix,
      ...inboundMessageHandlers,
      ...this.defaultHandlers.inboundMessage.suffix,
    ]);
    this.logger.debug(
      `Loaded ${this.inboundMessageHandlers.length} inbound message handlers`
    );
    this.logger.trace({
      ...this.inboundMessageHandlers.map(handler => handler.constructor.name),
    });

    this.outboundMessageHandlers = BaseHandler.map([
      ...this.defaultHandlers.outboundMessage.prefix,
      ...outboundMessageHandlers,
      ...this.defaultHandlers.outboundMessage.suffix,
    ]);
    this.logger.debug(
      `Loaded ${this.outboundMessageHandlers.length} outbound message handlers`
    );
    this.logger.trace({
      ...this.outboundMessageHandlers.map(handler => handler.constructor.name),
    });
  }

  protected get defaultOptions() {
    return {
      port: process.env.NODE_ENV === 'development' ? 8080 : 80,
      hostname: 'localhost',
      protocols: ProtocolVersions,
      actionsAllowed: OcppActions,
      maxConnections: 511,
      sessionTimeout: 30000,
      httpServerOptions: {},
    } as EndpointOptions;
  }

  protected get defaultHandlers() {
    return {
      authentication: {
        prefix: <AuthenticationHandler[]>[
          new Handlers.SessionExistsHandler(this.sessionStorage, this.logger),
          new Handlers.SessionTimeoutHandler(
            this.sessionStorage,
            this.logger,
            this.options.sessionTimeout
          ),
        ],
        suffix: <AuthenticationHandler[]>[],
      },
      inboundMessage: {
        prefix: [
          new Handlers.InboundMessageSynchronicityHandler(
            this.sessionStorage,
            this.logger
          ),
          new Handlers.InboundPendingMessageHandler(this.sessionStorage),
          new Handlers.InboundActionsAllowedHandler(this.options, this.logger),
        ],
        suffix: [new Handlers.DefaultMessageHandler(this.logger)],
      },
      outboundMessage: {
        prefix: [
          new Handlers.OutboundMessageSynchronicityHandler(
            this.sessionStorage,
            this.logger
          ),
          new Handlers.OutboundActionsAllowedHandler(this.options, this.logger),
        ],
        suffix: <OutboundMessageHandler[]>[
          this.sendMessageHandler,
          new Handlers.OutboundPendingMessageHandler(this.sessionStorage),
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
  }

  public handle<TRequest extends InboundCall>(
    action: OcppAction,
    callback: (
      data: CallPayload<TRequest>
    ) => Promise<CallResponsePayload<TRequest>>
  ) {
    const handler = new Handlers.ActionHandler(action, callback);
    this.addHandler(handler);
  }

  public async send<TRequest extends OutboundCall>(
    recipient: string,
    action: OcppAction,
    data: CallPayload<TRequest>,
    id: string = randomUUID()
  ): Promise<CallResponsePayload<TRequest>> {
    const message = new OutboundCall(new Client(recipient), id, action, data);
    await this.sendMessage(message);

    return new Promise((resolve, reject) => {
      const callback = async (data: CallPayload<TRequest>) => {
        this.removeHandler(handler);
        resolve(data as CallResponsePayload<TRequest>);
      };

      const handler = new Handlers.IdHandler(id, callback);
      this.addHandler(handler);
    });
  }

  protected async sendMessage(message: OutboundMessage) {
    if (!this.isListening) {
      this.logger.warn(
        oneLine`sendMessage() was called but endpoint is
        currently not listening for connections`
      );
      this.logger.trace(new Error().stack);
      return;
    }

    if (!this.hasSession(message.recipient.id)) {
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
      (force = false) => this.dropSession(request.client.id, force)
    );
    await this.sessionStorage.set(request.client.id, session);

    process.nextTick(() => {
      this.logger.info(
        `Client with id ${request.client.id} authenticated successfully`
      );
      this.emit('client_connected', request.client);
    });
  }

  protected async onSessionClosed(clientId: string) {
    if (!(await this.sessionStorage.has(clientId))) {
      this.logger.error(
        oneLine`onSessionClosed() was called but session for client
        with id ${clientId} does not exist`
      );
      this.logger.trace(new Error().stack);
      return;
    }

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

  protected addHandler(...handlers: InboundMessageHandler[]) {
    const length = this.defaultHandlers.inboundMessage.suffix.length;
    this.inboundMessageHandlers.splice(
      this.inboundMessageHandlers.length - length,
      length
    );

    this.inboundMessageHandlers = BaseHandler.map([
      ...this.inboundMessageHandlers,
      ...handlers,
      ...this.defaultHandlers.inboundMessage.suffix,
    ]);

    if (handlers.length === 1) {
      this.logger.debug(
        `Added inbound ${handlers[0].constructor.name} at position ${
          this.inboundMessageHandlers.length - length - 1
        }`
      );
    } else {
      this.logger.debug(
        `Added ${
          handlers.length
        } inbound message handlers starting at position ${
          this.inboundMessageHandlers.length - length - 1
        }`
      );
    }
  }

  protected removeHandler(...handlers: InboundMessageHandler[]) {
    this.inboundMessageHandlers = this.inboundMessageHandlers.filter(
      (handler, i) => {
        if (handlers.includes(handler)) {
          this.logger.debug(
            `Removed inbound ${handler.constructor.name} from position ${i}`
          );
          return false;
        } else {
          return true;
        }
      }
    );
  }
}

export default OcppEndpoint;
export { EndpointEvents, EndpointOptions };
