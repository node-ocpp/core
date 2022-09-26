// eslint-disable-next-line node/no-unpublished-import
import TypedEmitter from 'typed-emitter';
// eslint-disable-next-line prettier/prettier
import https, { Server as HTTPSServer, ServerOptions as HTTPSOptions } from 'https';
import http, { Server as HTTPServer, ServerOptions as HTTPOptions } from 'http';
import { EventEmitter } from 'events';
import merge from 'lodash.merge';
import os from 'os';

import OcppSession, { OcppClient, OcppSessionService } from './OcppSession';
import LocalSessionService from './services/LocalSessionService';
import { InboundOcppMessage, OutboundOcppMessage } from './OcppMessage';
import { OutboundOcppCallError } from './OcppCallErrorMessage';
import OcppAction, { OcppActions } from '../types/ocpp/OcppAction';
import OcppProtocolVersion, {
  OcppProtocolVersions,
} from '../types/ocpp/OcppProtocolVersion';
import * as Handlers from './handlers';
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
  client_connected: (client: OcppSession) => void;
  client_rejected: (request: OcppAuthenticationRequest) => void;
  client_disconnected: (client: OcppSession) => void;
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

  protected abstract handleDropSession(
    clientId: string,
    reason?: number,
    force?: boolean
  ): void;
  protected abstract handleSendMessage(
    message: OutboundOcppMessage
  ): Promise<void>;

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
    this.httpServer.on('error', this.handleHttpError);

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
        prefix: <OcppAuthenticationHandler[]>[],
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
        prefix: [
          new Handlers.OutboundActionsAllowedHandler(this.config),
          new Handlers.OutboundPendingMessageHandler(this.sessionService),
        ],
        suffix: <OutboundOcppMessageHandler[]>[],
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
      () => {
        this.emit('server_listening', this.config);
      }
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
      }

      this.emit('server_stopped');
    });
  }

  public async sendMessage(message: OutboundOcppMessage) {
    if (!this.isListening) {
      throw new Error('Endpoint is currently not listening for connections');
    } else if (!this.sessionService.has(message.recipient.id)) {
      throw new Error(
        `Client with id ${message.recipient.id} is currently not connected`
      );
    }

    await this.outboundMessageHandlers[0].handle(message);
    await this.handleSendMessage(message);
    this.emit('message_sent', message);
  }

  public async dropSession(clientId: string, reason?: number, force = false) {
    const session = await this.sessionService.get(clientId);
    if (session === null) {
      throw new Error(`Client with id ${clientId} is currently not connected`);
    }

    await this.handleDropSession(clientId, reason, force);
    this.onSessionClosed(session);
  }

  protected handleHttpError(err: Error) {
    throw new Error('Error occured in HTTP(s) server', { cause: err });
  }

  protected async onAuthenticationAttempt(request: OcppAuthenticationRequest) {
    await this.authenticationHandlers[0].handle(request);
  }

  protected onConnectionAccepted(request: OcppAuthenticationRequest) {
    this.onSessionCreated(
      new OcppSession(new OcppClient(request.client.id), request.protocol)
    );
  }

  protected onConnectionRejected(request: OcppAuthenticationRequest) {
    this.emit('client_rejected', request);
  }

  protected onSessionCreated(session: OcppSession) {
    if (this.sessionService.has(session.client.id)) {
      throw new Error(
        `Client with id ${session.client.id} is already connected`
      );
    }

    this.sessionService.add(session);
    this.emit('client_connected', session);
  }

  protected onSessionClosed(session: OcppSession) {
    if (!this.sessionService.has(session.client.id)) {
      throw new Error(
        `Client with id ${session.client.id} is currently not connected`
      );
    }

    this.sessionService.remove(session.client.id);
    this.emit('client_disconnected', session);
  }

  protected onInboundMessage(message: InboundOcppMessage) {
    this.emit('message_received', message);

    try {
      this.inboundMessageHandlers[0].handle(message);
    } catch (e) {
      if (e instanceof OutboundOcppCallError) {
        this.sendMessage(e);
      } else {
        throw e;
      }
    }
  }
}

export default OcppEndpoint;
export { OcppEndpointEvents, OcppEndpointConfig };
