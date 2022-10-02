import {
  AuthenticationHandler,
  AuthenticationRequest,
} from '../../src/common/handler';

class BasicAuthHandler extends AuthenticationHandler {
  async handle(request: AuthenticationRequest) {
    request.accept();
    return await super.handle(request);
  }
}

export default BasicAuthHandler;
