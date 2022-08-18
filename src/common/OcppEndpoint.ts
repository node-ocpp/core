/* eslint-disable node/no-unpublished-import */
import http, { Server as HTTPServer, ServerOptions as HTTPOptions } from 'http';
import { EventEmitter } from 'events';
import TypedEmitter from 'typed-emitter';
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
import {
  AsyncHandler,
  OcppAuthenticationHandler,
  OcppAuthenticationRequest,
  InboundOcppMessageHandler,
  OutboundOcppMessageHandler,
  CertificateAuthenticationRequest,
  BasicAuthenticationRequest,
  BasicAuthenticationHandler,
  CertificateAuthenticationHandler,
} from './OcppHandlers';

type OcppEndpointConfig = {
  port?: number;
  hostname?: string;
  httpOptions?: HTTPOptions;
  protocols?: Readonly<OcppProtocolVersion[]>;
  actionsAllowed?: Readonly<OcppAction[]>;
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
  public readonly config: TConfig;

  protected httpServer: HTTPServer;
  protected sessionService: OcppSessionService;
  protected basicAuthHandlers: BasicAuthenticationHandler[];
  protected certAuthHandlers: CertificateAuthenticationHandler[];
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
    outboundMessageHandlers?: OutboundOcppMessageHandler[],
    sessionService: OcppSessionService = new LocalSessionService()
  ) {
    super();
    this.config = merge(OcppEndpoint.defaultConfig, config);

    this.basicAuthHandlers = AsyncHandler.map([
      ...OcppEndpoint.defaultHandlers.authentication.prefix,
      ...authenticationHandlers.filter(
        handler => handler instanceof BasicAuthenticationHandler
      ),
      ...OcppEndpoint.defaultHandlers.authentication.suffix,
    ]) as BasicAuthenticationHandler[];

    this.certAuthHandlers = AsyncHandler.map([
      ...OcppEndpoint.defaultHandlers.authentication.prefix,
      ...authenticationHandlers.filter(
        handler => handler instanceof CertificateAuthenticationHandler
      ),
      ...OcppEndpoint.defaultHandlers.authentication.suffix,
    ]) as CertificateAuthenticationHandler[];

    this.inboundMessageHandlers = AsyncHandler.map([
      ...OcppEndpoint.defaultHandlers.inboundMessage.prefix,
      ...inboundMessageHandlers,
      ...OcppEndpoint.defaultHandlers.inboundMessage.suffix,
    ]);

    this.outboundMessageHandlers = AsyncHandler.map([
      ...OcppEndpoint.defaultHandlers.outboundMessage.prefix,
      ...outboundMessageHandlers,
      ...OcppEndpoint.defaultHandlers.outboundMessage.suffix,
    ]);

    this.httpServer = http.createServer(this.config.httpOptions);

    this.sessionService = sessionService;
    this.sessionService.create();
  }

  protected static defaultHttpOptions: HTTPOptions = {};

  protected static defaultConfig: OcppEndpointConfig = {
    port: process.env.NODE_ENV === 'development' ? 8080 : 80,
    hostname: os.hostname(),
    httpOptions: OcppEndpoint.defaultHttpOptions,
    protocols: OcppProtocolVersions,
    actionsAllowed: OcppActions,
    messageTimeout: 30000,
    sessionTimeout: 60000,
  };

  protected static defaultHandlers = {
    authentication: {
      prefix: <OcppAuthenticationHandler[]>[],
      suffix: <OcppAuthenticationHandler[]>[],
    },
    inboundMessage: {
      prefix: <InboundOcppMessageHandler[]>[],
      suffix: <InboundOcppMessageHandler[]>[],
    },
    outboundMessage: {
      prefix: <OutboundOcppMessageHandler[]>[],
      suffix: <OutboundOcppMessageHandler[]>[],
    },
  };

  public get isListening() {
    return this.httpServer.listening;
  }

  public async listen() {
    if (this.isListening) {
      throw new Error('Endpoint is already listening for connections');
    }

    this.emit('server_starting', this.config);
    await this.httpServer.listen(this.config.port, this.config.hostname);
    this.emit('server_listening', this.config);
  }

  public async stop() {
    if (!this.isListening) {
      throw new Error('Endpoint is currently not listening for connections');
    }

    this.emit('server_stopping');
    await this.httpServer.close();
    this.emit('server_stopped');
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

    await this.handleDropSession(clientId, reason);
    this.onSessionClosed(session);
  }

  protected handleBasicAuth(request: BasicAuthenticationRequest) {
    this.basicAuthHandlers[0].handle(request);
  }

  protected handleCertAuth(request: CertificateAuthenticationRequest) {
    this.certAuthHandlers[0].handle(request);
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
export { OcppEndpointEvents, OcppEndpointConfig, OcppProtocolVersion };
