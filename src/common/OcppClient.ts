declare type OcppClientId = string;

declare type OcppClient = {
  get id(): OcppClientId;
};

export default OcppClient;
