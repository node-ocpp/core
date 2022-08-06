import OcppClient from './OcppClient';
import OcppSession from './OcppSession';

interface OcppSessionService<
  TClient extends OcppClient = OcppClient,
  TSession extends OcppSession<TClient> = OcppSession<TClient>
> {
  init(): Promise<void>;
  add(sesion: TSession): Promise<void>;
  has(session: TSession): Promise<boolean>;
  has(clientId: string): Promise<boolean>;
  get(clientId: string): Promise<TSession>;
  update(clientId: string, newSession: TSession): Promise<void>;
  update(oldSession: TSession, newSession: TSession): Promise<void>;
  remove(session: TSession): Promise<void>;
  remove(clientId: string): Promise<void>;
}

export default OcppSessionService;
