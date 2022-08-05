/* eslint-disable node/no-unpublished-import */
import { EventEmitter } from 'events';
import TypedEmitter from 'typed-emitter';

import OcppClient from './OcppClient';
import OcppSession from './OcppSession';
import { InboundOcppMessage, OutboundOcppMessage } from './OcppMessage';
import {
  AsyncHandler,
  OcppAuthenticationHandler,
  OcppAuthenticationRequest,
  OcppMessageHandler,
} from './OcppHandlers';

abstract class OcppEndpoint<
  TConfig extends OcppEndpointConfig,
  TClient extends OcppClient,
  TSession extends OcppSession<TClient>,
  TInboundMessage extends InboundOcppMessage,
  TOutboundMessage extends OutboundOcppMessage,
  TMessageHandler extends OcppMessageHandler<TInboundMessage>,
  TAuthenticationRequest extends OcppAuthenticationRequest<TClient, TSession>,
  TAuthenticationHandler extends OcppAuthenticationHandler<
    TClient,
    TSession,
    TAuthenticationRequest
  >
> extends (EventEmitter as new () => TypedEmitter<OcppEndpointEvents>) {
  public readonly config: TConfig;

  private sessions: TSession[];
  private authenticationHandlers: TAuthenticationHandler[];
  private messageHandlers: TMessageHandler[];

  protected abstract get isListening(): boolean;
  protected abstract handleCreate(): void;
  protected abstract handleCreated(): void;
  protected abstract handleListen(): Promise<void>;
  protected abstract handleStop(): Promise<void>;
  protected abstract handleOutboundMessage(message: TOutboundMessage): Promise<TInboundMessage>;

  constructor(
    config: TConfig,
    authenticationHandlers: TAuthenticationHandler[],
    messageHandlers: TMessageHandler[]
  ) {
    super();
    this.handleCreate();
    this.config = config;
    this.authenticationHandlers.concat(AsyncHandler.map(authenticationHandlers));
    this.messageHandlers = AsyncHandler.map(messageHandlers);
    this.sessions = new Array<TSession>();
    this.handleCreated();
  }

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

  public async sendMessage(message: TOutboundMessage) {
    if (!this.isListening) {
      throw new Error('Endpoint is currently not listening for connections');
    } else if (!this.getSession(message.recipient.id)) {
      throw new Error(`Client with id ${message.recipient.id} is currently not connected`);
    }

    await this.handleOutboundMessage(message);
    this.emit('message_sent', message);
  }

  public getSession(clientId: string): TSession | false {
    const session = this.sessions.find(_session => _session.client.id === clientId);

    return session || false;
  }

  protected onConnectionAttempt(properties: TAuthenticationRequest) {
    this.authenticationHandlers[0].handle(properties);
  }

  protected onClientConnected(session: TSession) {
    if (this.getSession(session.client.id)) {
      throw new Error(`Client with id ${session.client.id} is already connected`);
    }

    this.sessions.push(session);
    this.emit('client_connected', session.client);
  }

  protected onClientDisconnected(session: TSession) {
    if (!this.getSession(session.client.id)) {
      throw new Error(`Client with id ${session.client.id} is currently not connected`);
    }

    this.sessions = this.sessions.filter(_session => _session.client.id !== session.client.id);
    this.emit('client_disconnected', session.client);
  }

  protected onInboundMessage(message: TInboundMessage) {
    this.emit('message_received', message);
    this.messageHandlers[0].handle(message);
  }
}

type OcppEndpointEvents = {
  server_starting: (config: OcppEndpointConfig) => void;
  server_listening: (config: OcppEndpointConfig) => void;
  server_stopping: () => void;
  server_stopped: () => void;
  client_connected: (client: OcppClient) => void;
  client_disconnected: (client: OcppClient) => void;
  message_sent: (message: OutboundOcppMessage) => void;
  message_received: (message: InboundOcppMessage) => void;
};

type OcppEndpointConfig = {
  port: number;
  messageTimeout: number;
};

export default OcppEndpoint;
export { OcppEndpointEvents, OcppEndpointConfig };
