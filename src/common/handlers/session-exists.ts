import { Logger } from 'ts-log';

import { SessionStorage } from '../session';
import { AuthenticationHandler, AuthenticationRequest } from '../handler';

class SessionExistsHandler extends AuthenticationHandler {
  private sessionStorage: SessionStorage;
  private logger: Logger;

  constructor(sessionStorage: SessionStorage, logger: Logger) {
    super();
    this.sessionStorage = sessionStorage;
    this.logger = logger;
  }

  async handle(request: AuthenticationRequest) {
    const session = await this.sessionStorage.get(request.client.id);

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
