import {
  OcppAuthenticationHandler,
  OcppAuthenticationRequest,
} from '../OcppHandlers';
import { OcppSessionService } from '../OcppSession';

class SessionExistsHandler extends OcppAuthenticationHandler {
  private sessionService: OcppSessionService;

  constructor(sessionService: OcppSessionService) {
    super();
    this.sessionService = sessionService;
  }

  async handle(request: OcppAuthenticationRequest) {
    if (await this.sessionService.has(request.client.id)) {
      request.reject(401);
      return;
    }

    super.handle(request);
  }
}

export default SessionExistsHandler;
