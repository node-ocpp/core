import { AsyncHandler } from './util/Handler';
import { OcppClient } from './OcppSession';
import OcppMessage, {
  InboundOcppMessage,
  OutboundOcppMessage,
} from './OcppMessage';
import OcppProtocolVersion from '../types/ocpp/OcppProtocolVersion';

abstract class OcppAuthenticationHandler<
  TRequest extends OcppAuthenticationRequest = OcppAuthenticationRequest
> extends AsyncHandler<TRequest> {}

interface OcppAuthenticationRequest {
  readonly client: OcppClient;
  readonly protocol: OcppProtocolVersion;
  accept(): void;
  reject(): void;
}

class CertificateAuthenticationHandler extends OcppAuthenticationHandler<CertificateAuthenticationRequest> {}

interface CertificateAuthenticationRequest extends OcppAuthenticationRequest {
  readonly certificate: unknown;
}

// eslint-disable-next-line prettier/prettier
class BasicAuthenticationHandler
  extends OcppAuthenticationHandler<BasicAuthenticationRequest> {}

interface BasicAuthenticationRequest extends OcppAuthenticationRequest {
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
