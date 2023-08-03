import ProtocolVersion, { ProtocolVersions } from '../types/ocpp/version';
import OcppAction, { OcppActions } from '../types/ocpp/action';

type EndpointOptions = {
  port?: number;
  hostname?: string;
  route?: string;
  protocols?: Readonly<ProtocolVersion[]>;
  actionsAllowed?: Readonly<OcppAction[]>;
  maxConnections?: number;
  sessionTimeout?: number;
  basicAuth?: boolean;
  certificateAuth?: boolean;
  validation?: boolean;
};

const defaultOptions = {
  port: process.env.PORT || process.env.NODE_ENV !== 'production' ? 8080 : 80,
  hostname: 'localhost',
  route: 'ocpp',
  protocols: ProtocolVersions,
  actionsAllowed: OcppActions,
  maxConnections: 511,
  sessionTimeout: 30000,
  basicAuth: true,
  certificateAuth: true,
  validation: true,
};

export default EndpointOptions;
export { defaultOptions };
