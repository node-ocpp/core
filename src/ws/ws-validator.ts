import path from 'path';
import { promises as fsPromises } from 'fs';
import { Logger } from 'ts-log';
import { Validator } from 'jsonschema';
import { oneLine } from 'common-tags';

import defaultLogger from '../common/util/logger';
import { Payload } from '../common/message';
import OcppAction from '../types/ocpp/action';
import MessageType from '../types/ocpp/type';
import ProtocolVersion from '../types/ocpp/version';

type ValidatorOptions = {
  schemaDir?: Map<ProtocolVersion[], string>;
};

const schemaBase = path.join(__dirname, '../../../var/jsonschema');
const defaultOptions = {
  schemaDir: new Map([
    // OCPP <= 1.6    /var/jsonschema/ocpp1.6
    [['ocpp1.2', 'ocpp1.5', 'ocpp1.6'], path.join(schemaBase, 'ocpp1.6')],
    // OCPP >= 2.0    /var/jsonschema/ocpp2.0.1
    [['ocpp2.0', 'ocpp2.0.1'], path.join(schemaBase, 'ocpp2.0.1')],
  ]) as Map<ProtocolVersion[], string>,
};

class WsValidator {
  protected options: ValidatorOptions;
  protected logger: Logger;
  protected validator: Validator;
  protected requestSchemas: Map<OcppAction, Record<string, any>>;
  protected responseSchemas: Map<OcppAction, Record<string, any>>;

  constructor(
    options: ValidatorOptions = defaultOptions,
    logger: Logger = defaultLogger
  ) {
    this.options = options;
    this.logger = logger;
    this.validator = new Validator();
    this.requestSchemas = new Map();
    this.responseSchemas = new Map();
  }

  public async validate(
    type: MessageType.CALL | MessageType.CALLRESULT,
    action: OcppAction,
    data: Payload,
    protocol: ProtocolVersion
  ) {
    let schema: Record<string, any>;
    let schemaType: 'request' | 'response';
    let schemaMap: Map<OcppAction, Record<string, any>>;

    switch (type) {
      case MessageType.CALL:
        schemaType = 'request';
        schemaMap = this.requestSchemas;
        break;

      case MessageType.CALLRESULT:
        schemaType = 'response';
        schemaMap = this.responseSchemas;
        break;
    }

    if (!schemaMap.has(action)) {
      schema = await this.loadSchema(schemaType, action, protocol);
      schemaMap.set(action, schema);
    } else {
      schema = schemaMap.get(action);
    }

    const result = this.validator.validate(data, schema);

    if (!result.valid) {
      this.logger.warn(
        `${action} ${MessageType[type]} payload validation failed`
      );
      this.logger.trace(result.errors);
    } else {
      this.logger.debug(
        `${action} ${MessageType[type]} payload validation successful`
      );
    }

    return result;
  }

  protected async loadSchema(
    type: 'request' | 'response',
    action: OcppAction,
    protocol: ProtocolVersion
  ) {
    let schemaDir: string;
    this.options.schemaDir.forEach((dir, protocols) => {
      if (protocols.includes(protocol)) {
        schemaDir = dir;
      }
    });

    if (!schemaDir) {
      const message = oneLine`Missing schema directory for
        protocol ${protocol} in WsValidator configuration`;
      this.logger.error(message);
      throw new Error(message);
    }

    const schemaPath = path.join(schemaDir, `${action}R${type.slice(1)}.json`);

    let rawSchema: string;
    try {
      rawSchema = await (await fsPromises.readFile(schemaPath)).toString();
    } catch (err) {
      const message = oneLine`Error while attempting
        to read JSON schema from file: ${schemaPath}`;
      this.logger.error(message);
      this.logger.trace(err);
      throw new Error(message, { cause: err as Error });
    }

    let jsonSchema: Record<string, any>;
    try {
      jsonSchema = JSON.parse(rawSchema);
    } catch (err) {
      const message = oneLine`Error while attempting to
      parse JSON schema loaded from file: ${schemaPath}`;
      this.logger.error(message);
      this.logger.trace(err);
      throw new Error(message, { cause: err as Error });
    }

    this.logger.debug(`Cached ${type} schema for ${action} (${protocol})`);

    return jsonSchema;
  }
}

export default WsValidator;
export { ValidatorOptions };
