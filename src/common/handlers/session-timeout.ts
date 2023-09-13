import AuthHandler, { AuthRequest } from '../auth';
import Session from '../session';

class SessionTimeoutHandler extends AuthHandler {
  handle(request: AuthRequest) {
    const endpoint = request.context.endpoint;
    const timeout = endpoint.options.sessionTimeout;

    const dropAfterTimeout = () => {
      if (!endpoint.isConnected(request.client.id)) {
        return;
      }

      const session = request.context.sessions.get(request.client.id);
      const difference =
        new Date().getTime() - session.lastInboundMessage?.timestamp.getTime();

      if (difference > timeout) {
        endpoint.drop(request.client.id, true);
        endpoint.removeListener('client_connected', listener);
        request.context.logger.warn(
          `Dropping client with id ${request.client.id} due to timeout`
        );
      }

      setTimeout(dropAfterTimeout, timeout);
    };

    const listener = (session: Session) => {
      if (request.client.id === session.client.id) {
        setTimeout(dropAfterTimeout, timeout);
      }
    };

    endpoint.on('client_connected', listener);
    return super.handle(request);
  }
}

export default SessionTimeoutHandler;
