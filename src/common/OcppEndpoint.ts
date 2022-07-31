import OcppClient from './OcppClient';
import OcppSession from './OcppSession';
import {
  InboundOcppMessage,
  OutboundOcppMessage,
} from '../types/ocpp/OcppMessage';
import {
  OcppAuthenticationHandler,
  OcppMessageHandler,
  OcppAuthenticationProperties,
} from './OcppHandlers';

abstract class OcppEndpoint<
  TConfig extends OcppEndpointConfig,
  TClient extends OcppClient,
  TSession extends OcppSession<TClient>,
  TInboundMessage extends InboundOcppMessage,
  TOutboundMessage extends OutboundOcppMessage,
  TAuthenticationProperties extends OcppAuthenticationProperties<
    TClient,
    TSession
  >,
  TAuthenticationHandler extends OcppAuthenticationHandler<
    TClient,
    TSession,
    TAuthenticationProperties
  >
> {
  public readonly config: TConfig;

  private sessions: TSession[];
  private authenticationHandlers: TAuthenticationHandler[];
  private messageHandlers: OcppMessageHandler[];

  protected abstract get isListening(): boolean;

  protected abstract handleCreate(): Promise<void>;
  protected abstract handleListen(): Promise<void>;
  protected abstract handleStop(): Promise<void>;
  protected abstract handleOutboundMessage(
    message: TOutboundMessage
  ): Promise<TInboundMessage | void>;

  constructor(
    config: TConfig,
    authenticationHandlers: TAuthenticationHandler[],
    messageHandlers: OcppMessageHandler[]
  ) {
    this.config = config;
    this.authenticationHandlers = authenticationHandlers;
    this.messageHandlers = messageHandlers;
    this.sessions = new Array<TSession>();
    this.handleCreate();
  }

  public async listen() {
    if (this.isListening) {
      throw new Error('Endpoint is already listening for connections');
    }

    await this.handleListen();
  }

  public async stop() {
    if (!this.isListening) {
      throw new Error('Endpoint is currently not listening for connections');
    }

    await this.handleStop();
  }

  public async sendMessage(message: TOutboundMessage) {
    if (!this.isListening) {
      throw new Error('Endpoint is currently not listening for connections');
    } else if (!this.getSession(message.recipient.id)) {
      throw new Error(
        `Client with id ${message.recipient} is currently not connected`
      );
    }

    return await this.handleOutboundMessage(message);
  }

  public getSession(clientId: string): TSession | false {
    const session = this.sessions.find(
      _session => _session.client.id === clientId
    );

    return session || false;
  }

  protected onClientConnected(session: TSession) {
    if (this.getSession(session.client.id)) {
      throw new Error(
        `Client with id ${session.client.id} is already connected`
      );
    }

    this.sessions.push();
  }

  protected onClientDisconnected(session: TSession) {
    if (!this.getSession(session.client.id)) {
      throw new Error(
        `Client with id ${session.client.id} is currently not connected`
      );
    }

    this.sessions = this.sessions.filter(
      _session => _session.client.id !== session.client.id
    );
  }

  protected onInboundMessage(message: TInboundMessage) {
    return; // TODO
  }
}

type OcppEndpointConfig = {
  port: number;
};
