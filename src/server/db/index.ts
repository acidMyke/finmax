import { env } from '~/env';
import { neon } from '@neondatabase/serverless';
import { Logger } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

/**
 * Cache the database connection in development. This avoids creating a new connection on every HMR
 * update.
 */
const globalForDb = globalThis as unknown as {
  conn: ReturnType<typeof neon>;
};

const logger: Logger = {
  logQuery(query, params) {
    // Highlight the query in the console
    console.log('\x1b[36m%s\x1b[0m\n', 'Database Query:', { query, params });
  },
};

const conn = globalForDb.conn ?? neon(env.DATABASE_URL);
if (env.NODE_ENV !== 'production') globalForDb.conn = conn;

export const db = drizzle(conn, { schema, logger });
