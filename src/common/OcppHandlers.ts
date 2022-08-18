import { AsyncHandler } from './util/Handler';
import OcppMessage, {
  InboundOcppMessage,
  OutboundOcppMessage,
} from './OcppMessage';

abstract class OcppAuthenticationHandler<
  OcppAuthenticationRequest
> extends AsyncHandler<OcppAuthenticationRequest> {}

abstract class OcppAuthenticationRequest {}

interface CertificateAuthenticationHandler
  extends OcppAuthenticationHandler<CertificateAuthenticationRequest> {
  readonly id: string;
  deny(): void;
  accept(): void;
}

interface CertificateAuthenticationRequest {
  readonly certificate: unknown;
}

// eslint-disable-next-line prettier/prettier
class BasicAuthenticationHandler
  extends OcppAuthenticationHandler<BasicAuthenticationRequest> {}

interface BasicAuthenticationRequest {
  readonly password: string;
}

abstract class OcppMessageHandler<
  TMessage extends OcppMessage = OcppMessage
> extends AsyncHandler<TMessage> {}

abstract class InboundOcppMessageHandler<
  TMessage extends InboundOcppMessage = InboundOcppMessage
> extends OcppMessageHandler<TMessage> {}

abstract class OutboundOcppMessageHandler<
  TMessage extends OutboundOcppMessage = OutboundOcppMessage
> extends OcppMessageHandler<TMessage> {}

export default AsyncHandler;
export {
  AsyncHandler,
  OcppAuthenticationHandler,
  OcppAuthenticationRequest,
  BasicAuthenticationHandler,
  BasicAuthenticationRequest,
  CertificateAuthenticationHandler,
  CertificateAuthenticationRequest,
  InboundOcppMessageHandler,
  OutboundOcppMessageHandler,
};
