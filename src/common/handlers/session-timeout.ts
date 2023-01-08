import { SessionService } from '../session';
import { AuthenticationHandler, AuthenticationRequest } from '../handler';
import { Logger } from 'ts-log';
import { oneLine } from 'common-tags';

class SessionTimeoutHandler extends AuthenticationHandler {
  private sessionService;
  private logger;
  private timeout;

  constructor(sessionService: SessionService, logger: Logger, timeout: number) {
    super();
    this.sessionService = sessionService;
    this.sessionService.create();
    this.logger = logger;
    this.timeout = timeout;
  }

  async handle(request: AuthenticationRequest) {
    const dropAfterTimeout = async () => {
      const session = await this.sessionService.get(request.client.id);
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
