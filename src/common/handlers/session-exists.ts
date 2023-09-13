import AuthHandler, { AuthRequest } from '../auth';

class SessionExistsHandler extends AuthHandler {
  handle(request: AuthRequest) {
    if (request.context.endpoint.isConnected(request.client.id)) {
      request.context.logger.warn(
        `Client with id ${request.client.id} is already connected`
      );
      request.reject(403);
      return;
    }

    return super.handle(request);
  }
}

export default SessionExistsHandler;
