import { Logger } from 'ts-log';

import {
  OcppAuthenticationHandler,
  OcppAuthenticationRequest,
} from '../OcppHandlers';
import { OcppSessionService } from '../OcppSession';

class SessionExistsHandler extends OcppAuthenticationHandler {
  private sessionService: OcppSessionService;
  private logger: Logger;

  constructor(sessionService: OcppSessionService, logger: Logger) {
    super();
    this.sessionService = sessionService;
    this.logger = logger;
  }

  async handle(request: OcppAuthenticationRequest) {
    if (await this.sessionService.has(request.client.id)) {
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
