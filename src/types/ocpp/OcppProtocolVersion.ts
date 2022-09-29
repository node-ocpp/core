const OcppProtocolVersions = [
  'ocpp1.2',
  'ocpp1.5',
  'ocpp1.6',
  'ocpp2.0',
  'ocpp2.0.1',
] as const;

declare type OcppProtocolVersion = typeof OcppProtocolVersions[number];

export default OcppProtocolVersion;
export { OcppProtocolVersions };
