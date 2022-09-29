import {
  OcppAuthenticationHandler,
  OcppAuthenticationRequest,
} from '../../src/common/OcppHandlers';

class AuthenticationHandler extends OcppAuthenticationHandler {
  async handle(request: OcppAuthenticationRequest) {
    request.accept();
    return await super.handle(request);
  }
}

export default AuthenticationHandler;
