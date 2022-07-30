declare enum OcppMessageType {
  CALL = 2,
  CALLRESULT = 3,
  CALLERROR = 4,
}

declare type OcppMessageId = string;

declare type OcppMessage = {
  type: OcppMessageType;
  id: OcppMessageId;
};

export default OcppMessage;
