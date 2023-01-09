import { SessionStorage } from '../session';
import { AuthenticationHandler, AuthenticationRequest } from '../handler';
import { Logger } from 'ts-log';

class SessionTimeoutHandler extends AuthenticationHandler {
  private sessionStorage;
  private logger;
  private timeout;

  constructor(sessionStorage: SessionStorage, logger: Logger, timeout: number) {
    super();
    this.sessionStorage = sessionStorage;
    this.logger = logger;
    this.timeout = timeout;
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

    setTimeout(dropAfterTimeout, this.timeout * 1.25);
    return await super.handle(request);
  }
}

export default SessionTimeoutHandler;
