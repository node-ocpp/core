import AuthHandler, { AcceptanceState, AuthRequest } from '../auth';

class DefaultAuthHandler extends AuthHandler {
  handle(request: AuthRequest) {
    if (request.state !== AcceptanceState.Pending) {
      return super.handle(request);
    }

    if (request.context.endpoint.options.authRequired) {
      request.reject();
    } else {
      request.accept();
    }

    return super.handle(request);
  }
}

export default DefaultAuthHandler;
