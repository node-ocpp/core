/* eslint-disable node/no-unpublished-import */
import { EventEmitter } from 'events';
import TypedEmitter from 'typed-emitter';
import merge from 'lodash.merge';

import OcppSession, { OcppSessionService } from './OcppSession';
import LocalSessionService from './services/LocalSessionService';
import { InboundOcppMessage, OutboundOcppMessage } from './OcppMessage';
import { OutboundOcppCallError } from './OcppCallErrorMessage';
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
  protocols?: OcppProtocolVersion[];
  messageTimeout?: number;
  sessionTimeout?: number;
};

type OcppEndpointEvents = {
  server_starting: (config: OcppEndpointConfig) => void;
  server_listening: (config: OcppEndpointConfig) => void;
  server_stopping: () => void;
  server_stopped: () => void;
  client_connected: (client: OcppSession) => void;
  client_disconnected: (client: OcppSession) => void;
  message_sent: (message: OutboundOcppMessage) => void;
  message_received: (message: InboundOcppMessage) => void;
};

abstract class OcppEndpoint<
  TConfig extends OcppEndpointConfig,
  TAuthenticationRequest extends OcppAuthenticationRequest,
  TAuthenticationHandler extends OcppAuthenticationHandler<TAuthenticationRequest>
> extends (EventEmitter as new () => TypedEmitter<OcppEndpointEvents>) {
  public readonly config: TConfig;

  private sessionService: OcppSessionService;
  private authenticationHandlers: TAuthenticationHandler[];
  private inboundMessageHandlers: InboundOcppMessageHandler[];
  private outboundMessageHandlers: OutboundOcppMessageHandler[];

  protected abstract get isListening(): boolean;
  protected abstract handleListen(): void;
  protected abstract handleStop(): void;
  protected abstract handleDrop(clientId: string): void;
  protected abstract handleSend(message: OutboundOcppMessage): Promise<void>;

  constructor(
    config: TConfig,
    authenticationHandlers: TAuthenticationHandler[],
    inboundMessageHandlers: InboundOcppMessageHandler[],
    outboundMessageHandlers?: OutboundOcppMessageHandler[],
    sessionService: OcppSessionService = new LocalSessionService()
  ) {
    super();
    this.config = merge(OcppEndpoint.defaultConfig, config);

    this.authenticationHandlers.concat(
      AsyncHandler.map(authenticationHandlers)
    );
    this.inboundMessageHandlers.concat(
      AsyncHandler.map(inboundMessageHandlers)
    );
    this.outboundMessageHandlers.concat(
      AsyncHandler.map(outboundMessageHandlers)
    );

    this.sessionService = sessionService;
    this.sessionService.create();
  }

  protected static defaultConfig: OcppEndpointConfig = {
    port: process.env.NODE_ENV === 'development' ? 8080 : 80,
    protocols: OcppProtocolVersions,
    messageTimeout: 30000,
    sessionTimeout: 60000,
  };

  public async listen() {
    if (this.isListening) {
      throw new Error('Endpoint is already listening for connections');
    }

    this.emit('server_starting', this.config);
    await this.handleListen();
    this.emit('server_listening', this.config);
  }

  public async stop() {
    if (!this.isListening) {
      throw new Error('Endpoint is currently not listening for connections');
    }

    this.emit('server_stopping');
    await this.handleStop();
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
    await this.handleSend(message);
    this.emit('message_sent', message);
  }

  public async dropSession(clientId: string) {
    const session = await this.sessionService.get(clientId);
    if (session === null) {
      throw new Error(`Client with id ${clientId} is currently not connected`);
    }

    await this.handleDrop(clientId);
    this.onSessionClosed(session);
  }

  protected onConnectionAttempt(properties: TAuthenticationRequest) {
    this.authenticationHandlers[0].handle(properties);
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
