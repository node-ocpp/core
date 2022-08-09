import IdToken from './IdToken';

declare type IdTagInfo = {
  expiryDate?: Date;
  parentIdTag?: IdToken;
  status: AuthorizationStatus;
};

declare type AuthorizationStatus =
  | 'Accepted'
  | 'Blocked'
  | 'Expired'
  | 'Invalid'
  | 'ConcurrentTx';

export default IdTagInfo;
