import ProtocolVersion, { ProtocolVersions } from '../types/ocpp/version';
import OcppAction, { OcppActions } from '../types/ocpp/action';

type EndpointOptions = Partial<{
  port: number;
  hostname: string;
  route: string;
  protocols: Readonly<ProtocolVersion[]>;
  actionsAllowed: Readonly<OcppAction[]>;
  maxConnections: number;
  sessionTimeout: number;
  authRequired: boolean;
  basicAuth: boolean;
  certificateAuth: boolean;
  validation: boolean;
}>;

const defaultOptions: EndpointOptions = {
  port: process.env.PORT || process.env.NODE_ENV !== 'production' ? 8080 : 80,
  hostname: 'localhost',
  route: '/ocpp',
  protocols: ProtocolVersions,
  actionsAllowed: OcppActions,
  maxConnections: 511,
  sessionTimeout: 30000,
  authRequired: true,
  basicAuth: true,
  certificateAuth: false,
  validation: true,
};

export default EndpointOptions;
export { defaultOptions };
