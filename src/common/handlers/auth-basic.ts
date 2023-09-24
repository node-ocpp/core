import { BasicAuthResult } from 'basic-auth';
import AuthHandler, { AcceptanceState, AuthRequest } from '../auth';

type BasicAuthCallback = (credentials: BasicAuthResult) => boolean;

class BasicAuthHandler extends AuthHandler {
  private callback;

  constructor(callback: BasicAuthCallback) {
    super();
    this.callback = callback;
  }

  handle(request: AuthRequest) {
    if (request.state !== AcceptanceState.Pending) {
      return super.handle(request);
    }

    if (this.callback(request.basicAuth)) {
      request.accept();
    } else {
      request.reject();
    }

    return super.handle(request);
  }
}

export default BasicAuthHandler;
export { BasicAuthCallback };
