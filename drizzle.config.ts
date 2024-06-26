import { env } from '~/env';
import { type Config } from 'drizzle-kit';

export default {
  schema: ['./src/server/db/schema.ts', './src/server/db/relations.ts'],
  dialect: 'postgresql',
  dbCredentials: { url: env.DATABASE_URL },
  tablesFilter: ['finmax_*'],
} satisfies Config;
