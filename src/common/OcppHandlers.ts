import OcppClient from './OcppClient';
import OcppSession from './OcppSession';
import { InboundOcppMessage } from '../types/ocpp/OcppMessage';

interface OcppAuthenticationHandler<
  TClient extends OcppClient,
  TSession extends OcppSession<TClient>,
  TAuthenticationProperties extends OcppAuthenticationProperties<
    TClient,
    TSession
  >
> {
  handleAuthentication: (
    properties: TAuthenticationProperties,
    next: () => void
  ) => TSession;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface OcppAuthenticationProperties<
  TClient extends OcppClient,
  TSession extends OcppSession<TClient>
> {}

interface OcppMessageHandler {
  handleMessage: (message: InboundOcppMessage, next: () => void) => void;
}

export {
  OcppAuthenticationHandler,
  OcppAuthenticationProperties,
  OcppMessageHandler,
};
