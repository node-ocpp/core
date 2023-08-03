import { SessionStorage } from '../session';
import { AuthenticationHandler, AuthenticationRequest } from '../handler';
import { Logger } from 'ts-log';
import { EndpointOptions } from '../endpoint';

class SessionTimeoutHandler extends AuthenticationHandler {
  private sessionStorage: SessionStorage;
  private logger: Logger;
  private timeout: number;
  private tolerance: number;

  constructor(
    sessionStorage: SessionStorage,
    logger: Logger,
    options: EndpointOptions,
    tolerance = 1.25
  ) {
    super();
    this.sessionStorage = sessionStorage;
    this.logger = logger;
    this.timeout = options.sessionTimeout;
    this.tolerance = tolerance;
  }

  async handle(request: AuthenticationRequest) {
    const dropAfterTimeout = async () => {
      const session = await this.sessionStorage.get(request.client.id);
      const difference =
        new Date().getTime() - session.lastInboundMessage?.timestamp.getTime();

      if (session?.isActive && difference > this.timeout) {
        session.drop(true);
        this.logger.warn(
          `Dropping client with id ${request.client.id} due to timeout`
        );
      }

      if (session?.isActive) {
        setTimeout(dropAfterTimeout, this.timeout);
      }
    };

    setTimeout(dropAfterTimeout, this.timeout * this.tolerance);
    return await super.handle(request);
  }
}

export default SessionTimeoutHandler;
