import { Logger } from 'ts-log';

import { SessionService } from '../session';
import { AuthenticationHandler, AuthenticationRequest } from '../handler';

class SessionExistsHandler extends AuthenticationHandler {
  private sessionService: SessionService;
  private logger: Logger;

  constructor(sessionService: SessionService, logger: Logger) {
    super();
    this.sessionService = sessionService;
    this.logger = logger;
  }

  async handle(request: AuthenticationRequest) {
    const session = await this.sessionService.get(request.client.id);

    if (session?.isActive) {
      this.logger.warn(
        `Client with id ${request.client.id} is already connected`
      );
      request.reject(403);
      return;
    }

    return await super.handle(request);
  }
}

export default SessionExistsHandler;
