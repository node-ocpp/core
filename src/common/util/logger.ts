import winston, { Logger, format, transports } from 'winston';
import _ from 'lodash';

import OcppMessage from '../message';

const config = {
  transports: [new transports.Console({})],
  level:
    process.env.LOG_LEVEL?.toLowerCase() ??
    (process.env.NODE_ENV !== 'production' ? 'debug' : 'info'),

  levels: {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
    trace: 4,
  },

  format: format.combine(
    format(log => {
      log.level = log.level.toUpperCase();
      return log;
    })(),
    format.colorize(),
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    format.printf(log => {
      if (log.message instanceof OcppMessage) {
        return JSON.stringify(
          _.pick(log.message, [
            'id',
            'type',
            'action',
            'data',
            'code',
            'description',
            'details',
          ]),
          null,
          2
        );
      }

      if (typeof log.message === 'object' || Array.isArray(log.message)) {
        log.message = logObject(log.message);
      }

      return `${log.timestamp} [${log.level}] ` + log.message;
    })
  ),
};

winston.addColors({ trace: 'grey' });

type DefaultLogger = Logger & {
  trace(message?: any, ...optionalParams: any[]): void;
};

const logObject = (object: object) => JSON.stringify(object, null, '  ');

export default winston.createLogger(config) as DefaultLogger;
export { logObject };
