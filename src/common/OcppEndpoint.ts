// eslint-disable-next-line node/no-unpublished-import
import TypedEmitter from 'typed-emitter';

import https, {
  Server as HTTPSServer,
  ServerOptions as HTTPSOptions,
} from 'https';

import http, { Server as HTTPServer, ServerOptions as HTTPOptions } from 'http';
import { EventEmitter } from 'events';
import merge from 'lodash.merge';
import os from 'os';

import OcppSession, { OcppClient, OcppSessionService } from './OcppSession';
import LocalSessionService from './services/LocalSessionService';
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
    sessionService: OcppSessionService = new LocalSessionService()
  ) {
    super();
    this._config = merge(this.defaultConfig, config);

    this.httpServer = this.config.https
      ? https.createServer(this.config.httpOptions)
      : http.createServer(this.config.httpOptions);
    this.httpServer.on('error', this.onHttpError);

    this.sessionService = sessionService;
    this.sessionService.create();

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
      hostname: os.hostname(),
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
          new Handlers.SessionExistsHandler(this.sessionService),
        ],
        suffix: <OcppAuthenticationHandler[]>[],
      },
      inboundMessage: {
        prefix: [
          new Handlers.InboundActionsAllowedHandler(this.config),
          new Handlers.InboundMessageSynchronicityHandler(this.sessionService),
          new Handlers.InboundPendingMessageHandler(this.sessionService),
        ],
        suffix: <InboundOcppMessageHandler[]>[],
      },
      outboundMessage: {
        prefix: [new Handlers.OutboundActionsAllowedHandler(this.config)],
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
      throw new Error('Endpoint is already listening for connections');
    }

    this.emit('server_starting', this.config);
    this.httpServer.listen(
      this.config.port,
      this.config.hostname,
      this.config.maxConnections,
      () => this.emit('server_listening', this.config)
    );
  }

  public stop() {
    if (!this.isListening) {
      throw new Error('Endpoint is currently not listening for connections');
    }

    this.emit('server_stopping');
    this.httpServer.close(err => {
      if (err) {
        throw new Error('Error while stopping HTTP(S) server', { cause: err });
      } else {
        this.emit('server_stopped');
      }
    });
  }

  protected async sendMessage(message: OutboundOcppMessage) {
    if (!this.isListening) {
      throw new Error('Endpoint is currently not listening for connections');
    } else if (!this.hasSession(message.recipient.id)) {
      throw new Error(
        `Client with id ${message.recipient.id} is currently not connected`
      );
    }

    await this.outboundMessageHandlers[0].handle(message);
    message.setSent();
    this.emit('message_sent', message);
  }

  protected onHttpError(err: Error) {
    throw new Error('Error occured in HTTP(s) server', { cause: err });
  }

  protected async onAuthenticationAttempt(request: OcppAuthenticationRequest) {
    this.emit('client_connecting', request.client);
    await this.authenticationHandlers[0].handle(request);
  }

  protected onAuthenticationFailure(request: OcppAuthenticationRequest) {
    this.emit('client_rejected', request.client);
  }

  protected async onAuthenticationSuccess(request: OcppAuthenticationRequest) {
    if (await this.hasSession(request.client.id)) {
      throw new Error(
        `Client with id ${request.client.id} is already connected`
      );
    }

    const session = new OcppSession(
      request.client,
      request.protocol,
      () => this.hasSession(request.client.id),
      () => this.dropSession(request.client.id)
    );

    await this.sessionService.add(session);
    this.emit('client_connected', request.client);
  }

  protected onSessionClosed(clientId: string) {
    if (!this.sessionService.has(clientId)) {
      throw new Error(`Client with id ${clientId} is currently not connected`);
    }

    this.sessionService.remove(clientId);
    this.emit('client_disconnected', new OcppClient(clientId));
  }

  protected async onInboundMessage(message: InboundOcppMessage) {
    this.emit('message_received', message);

    try {
      await this.inboundMessageHandlers[0].handle(message);
    } catch (err) {
      if (err instanceof OutboundOcppCallError) {
        await this.sendMessage(err);
      } else {
        throw err;
      }
    }
  }
}

export default OcppEndpoint;
export { OcppEndpointEvents, OcppEndpointConfig };
