const ProtocolVersions = [
  'ocpp1.2',
  'ocpp1.5',
  'ocpp1.6',
  'ocpp2.0',
  'ocpp2.0.1',
] as const;

declare type ProtocolVersion = typeof ProtocolVersions[number];

export default ProtocolVersion;
export { ProtocolVersions };
