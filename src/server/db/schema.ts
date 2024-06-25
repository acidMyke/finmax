// Example model schema from the Drizzle docs
// https://orm.drizzle.team/docs/sql-schema-declaration
import { sql } from 'drizzle-orm';
import {
  boolean,
  char,
  index,
  jsonb,
  pgTableCreator,
  text,
  timestamp,
  pgEnum,
  foreignKey,
  integer,
  numeric,
} from 'drizzle-orm/pg-core';

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
const createTable = pgTableCreator(name => `finmax_${name}`);

export const usersTable = createTable(
  'users',
  {
    id: char('id', { length: 12 }).primaryKey(),
    clerkId: char('clerk_id', { length: 32 }).notNull().unique(),
    pfp: text('pfp'),
    inactive: boolean('inactive').default(false),
    settings: jsonb('settings').default({}),
    defaultAccountId: char('default_account_id', { length: 12 }),
    defaultMethodId: char('default_method_id', { length: 12 }),
  },
  table => {
    return {
      clerkIdIndex: index('clerk_id_index').on(table.clerkId),
      // TODOS
      // defaultAccountReference: foreignKey({}),
      // defaultMethodReference: foreignKey({}),
    };
  },
);

export const changeTypeEnum = pgEnum('finmax_change_type', ['insert', 'update', 'delete']);

export const changesTable = createTable(
  'changes',
  {
    id: char('id', { length: 12 }).primaryKey(),
    at: timestamp('at').notNull().defaultNow(),
    by: char('by', { length: 12 }).notNull(),
    entity: text('entity').notNull(),
    entityId: char('entity_id', { length: 12 }).notNull(),
    version: integer('version').notNull(),
    type: changeTypeEnum('type').notNull(),
    dataBefore: jsonb('data_before'),
    dataAfter: jsonb('data_after'),
    isRevert: boolean('is_revert').default(false),
    revertOf: char('revert_of', { length: 12 }),
    notes: text('notes'),
    metadata: jsonb('metadata'),
  },
  table => {
    return {
      userReference: foreignKey({
        columns: [table.by],
        foreignColumns: [usersTable.id],
        name: 'fk_changes_user',
      }),
      revertReference: foreignKey({
        columns: [table.revertOf],
        foreignColumns: [table.id],
        name: 'fk_changes_revert',
      }),
    };
  },
);

export const transactionsTable = createTable(
  'transactions',
  {
    id: char('id', { length: 12 }).primaryKey(),
    userId: char('user_id', { length: 12 }).notNull(),
    date: timestamp('date').notNull(),
    amount: numeric('amount', { precision: 8, scale: 3 }).notNull(),
    payeeId: char('payee_id', { length: 12 }).notNull(),
    description: text('description'),
    accountId: char('account_id', { length: 12 }),
    methodId: char('method_id', { length: 12 }),
    categoryId: char('category_id', { length: 12 }),
    subscriptionId: char('subscription_id', { length: 12 }),
    parentId: char('parent_id', { length: 12 }),
    metadata: jsonb('metadata'),
  },
  table => {
    return {
      userReference: foreignKey({
        columns: [table.userId],
        foreignColumns: [usersTable.id],
        name: 'fk_transactions_user',
      }),
      parentReference: foreignKey({
        columns: [table.parentId],
        foreignColumns: [table.id],
        name: 'fk_transactions_parent',
      }),
      // TODOS
      // payeeReference: foreignKey({}),
      // accountReference: foreignKey({}),
      // methodReference: foreignKey({}),
      // categoryReference: foreignKey({}),
      // subscriptionReference: foreignKey({}),
    };
  },
);
