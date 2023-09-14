import { oneLine } from 'common-tags';

import AuthHandler, { AuthRequest } from '../auth';

class PreconditionsHandler extends AuthHandler {
  async handle(request: AuthRequest) {
    const { options } = request.context.endpoint;

    if (request.context.endpoint.isConnected(request.client.id)) {
      request.context.logger.warn(
        `Client with id ${request.client.id} is already connected`
      );
      request.reject(403);
      return request;
    }

    if (!options.authRequired) {
      return super.handle(request);
    }

    if (request.isCertificateValid) {
      request.accept();
    } else if (!request.basicAuth) {
      request.context.logger.warn(
        oneLine`Neither BASIC credentials nor valid certificate
        were supplied by client with id ${request.client.id}`
      );
      request.reject();
    }

    return super.handle(request);
  }
}

export default PreconditionsHandler;
