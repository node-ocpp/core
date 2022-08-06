declare type MeterValue = {
  timestamp: Date;
  sampledValue: SampledValue[];
};

declare type SampledValue = {
  value: string;
  context?: ReadingContext;
  format?: ValueFormat;
  measurand?: Measurand;
  phase?: Phase;
  location?: Location;
  unit?: UnitOfMeasure;
};

declare type ReadingContext =
  | 'Interruption.Begin'
  | 'Interruption.End'
  | 'Other'
  | 'Sample.Clock'
  | 'Sample.Periodic'
  | 'Transaction.Begin'
  | 'Transaction.End'
  | 'Trigger';

declare type ValueFormat = 'Raw' | 'SignedData';

declare type Measurand =
  | 'Current.Export'
  | 'Current.Import'
  | 'Current.Offered'
  | 'Energy.Active.Export.Register'
  | 'Energy.Active.Import.Register'
  | 'Energy.Reactive.Export.Register'
  | 'Energy.Reactive.Import.Register'
  | 'Energy.Active.Export.Interval'
  | 'Energy.Active.Import.Interval'
  | 'Energy.Reactive.Export.Interval'
  | 'Energy.Reactive.Import.Interval'
  | 'Frequency'
  | 'Power.Active.Export'
  | 'Power.Active.Import'
  | 'Power.Factor'
  | 'Power.Offered'
  | 'Power.Reactive.Export'
  | 'Power.Reactive.Import'
  | 'RPM'
  | 'SoC'
  | 'Temperature'
  | 'Voltage';

declare type Phase =
  | 'L1'
  | 'L2'
  | 'L3'
  | 'N'
  | 'L1-N'
  | 'L2-N'
  | 'L3-N'
  | 'L1-L2'
  | 'L2-L3'
  | 'L3-L1';

declare type Location = 'Body' | 'Cable' | 'EV' | 'Inlet' | 'Outlet';

declare type UnitOfMeasure =
  | 'Wh'
  | 'kWh'
  | 'varh'
  | 'kvarh'
  | 'W'
  | 'kW'
  | 'VA'
  | 'kVA'
  | 'var'
  | 'kvar'
  | 'A'
  | 'V'
  | 'Celsius'
  | 'Fahrenheit'
  | 'K'
  | 'Percent';

export default MeterValue;
