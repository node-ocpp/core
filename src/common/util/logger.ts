import { Logger } from 'ts-log';
import winston, { format, transports } from 'winston';
import pick from 'lodash.pick';

import OcppMessage from '../message';

const config = {
  transports: [new transports.Console({})],
  level:
    process.env.LOG_LEVEL?.toLowerCase() ??
    (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
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
          pick(log.message, [
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
        return JSON.stringify(log.message, null, '  ');
      }

      return `${log.timestamp} [${log.level}] ` + log.message;
    })
  ),
};

winston.addColors({ trace: 'grey' });

export default winston.createLogger(config) as unknown as Logger;
