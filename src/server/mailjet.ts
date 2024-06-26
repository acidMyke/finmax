import { env } from '~/env';
import Mailjet from 'node-mailjet';

const globalForMailjet = globalThis as unknown as {
  mailjetClient: ReturnType<typeof Mailjet.apiConnect>;
};

const mailjetClient = globalForMailjet.mailjetClient ?? Mailjet.apiConnect(env.MJ_APIKEY_PUBLIC, env.MJ_APIKEY_PRIVATE);

if (env.NODE_ENV !== 'production') {
  globalForMailjet.mailjetClient = mailjetClient;
}

export default mailjetClient;
