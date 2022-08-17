const OcppActions = [
  'Authorize',
  'BootNotification',
  'ChangeAvailability',
  'ChangeConfiguration',
  'ClearCache',
  'GetConfiguration',
  'Heartbeat',
  'MeterValues',
  'RemoteStartTransaction',
  'RemoteStopTransaction',
  'Reset',
  'StartTransaction',
  'StatusNotification',
  'StopTransaction',
  'UnlockConnector',
];

declare type OcppAction = typeof OcppActions[number];

export default OcppAction;
export { OcppActions };
