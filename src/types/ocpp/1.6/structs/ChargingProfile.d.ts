declare type ChargingProfile = {
  chargingProfileId: number;
  transactionId?: number;
  stackLevel: number;
  chargingProfilePurposeType: ChargingProfilePurposeType;
  chargingProfileKind: ChargingProfileKindType;
  recurrencyKind?: RecurrencyKindType;
  validFrom?: Date;
  validTo?: Date;
  chargingSchedule: ChargingSchedule;
};

declare type ChargingProfilePurposeType =
  | 'ChargePointMaxProfile'
  | 'TxDefaultProfile'
  | 'TxProfile';

declare type ChargingProfileKindType = 'Absolute' | 'Recurring' | 'Relative';

declare type RecurrencyKindType = 'Daily' | 'Weekly';

declare type ChargingSchedule = {
  duration?: number;
  startSchedule?: Date;
  chargingRateUnit: ChargingRateUnit;
  chargingSchedulePeriod: ChargingSchedulePeriod[];
  minChargingRate?: number;
};

declare type ChargingRateUnit = 'W' | 'A';

declare type ChargingSchedulePeriod = {
  startPeriod: number;
  limit: number;
  numberPhases?: number;
};

export default ChargingProfile;
