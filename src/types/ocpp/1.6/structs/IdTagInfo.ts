declare type IdTagInfo = {
  expiryDate?: Date;
  parentIdTag?: string;
  status: AuthorizationStatus;
};

declare type AuthorizationStatus =
  | 'Accepted'
  | 'Blocked'
  | 'Expired'
  | 'Invalid'
  | 'ConcurrentTx';

export default IdTagInfo;
