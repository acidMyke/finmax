// Example model schema from the Drizzle docs
// https://orm.drizzle.team/docs/sql-schema-declaration
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
  varchar,
  AnyPgColumn,
  primaryKey,
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
    defaultAccountId: char('default_account_id', { length: 12 }).references((): AnyPgColumn => accountsTable.id),
    defaultMethodId: char('default_method_id', { length: 12 }).references((): AnyPgColumn => methodsTable.id),
  },
  table => ({
    clerkIdIndex: index('clerk_id_index').on(table.clerkId),
  }),
);

export const changeTypeEnum = pgEnum('finmax_change_type', ['insert', 'update', 'delete']);

export const changesTable = createTable(
  'changes',
  {
    id: char('id', { length: 12 }).primaryKey(),
    at: timestamp('at').notNull().defaultNow(),
    by: char('by', { length: 12 })
      .notNull()
      .references(() => usersTable.id),
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
  table => ({
    revertReference: foreignKey({
      columns: [table.revertOf],
      foreignColumns: [table.id],
      name: 'fk_changes_revert',
    }),
  }),
);

export const transactionsTable = createTable(
  'transactions',
  {
    id: char('id', { length: 12 }).primaryKey(),
    userId: char('user_id', { length: 12 })
      .notNull()
      .references(() => usersTable.id),
    date: timestamp('date').notNull(),
    amount: numeric('amount', { precision: 8, scale: 3 }).notNull(),
    payeeId: char('payee_id', { length: 12 })
      .notNull()
      .references(() => payeesTable.id),
    description: text('description'),
    accountId: char('account_id', { length: 12 })
      .notNull()
      .references(() => accountsTable.id),
    methodId: char('method_id', { length: 12 })
      .notNull()
      .references(() => methodsTable.id),
    categoryId: char('category_id', { length: 12 })
      .notNull()
      .references(() => categoriesTable.id),
    subscriptionId: char('subscription_id', { length: 12 }).references(() => subscriptionsTable.id),
    parentId: char('parent_id', { length: 12 }),
    metadata: jsonb('metadata'),
  },
  table => ({
    parentReference: foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: 'fk_transactions_parent',
    }),
  }),
);

export const accountsTable = createTable('accounts', {
  id: char('id', { length: 12 }).primaryKey(),
  userId: char('user_id', { length: 12 })
    .notNull()
    .references(() => usersTable.id),
  label: varchar('label', { length: 64 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('SGD'),
  iconId: char('icon_id', { length: 12 }).references(() => iconsTable.id),
  metadata: jsonb('metadata'),
});

export const methodsTable = createTable('methods', {
  id: char('id', { length: 12 }).primaryKey(),
  userId: char('user_id', { length: 12 })
    .notNull()
    .references(() => usersTable.id),
  label: varchar('label', { length: 64 }).notNull(),
  autoRegex: text('auto_regex'),
  iconId: char('icon_id', { length: 12 }).references(() => iconsTable.id),
  isPublic: boolean('is_public').default(false),
  metadata: jsonb('metadata'),
});

export const accountsMethodsTable = createTable(
  'accounts_methods',
  {
    accountId: char('account_id', { length: 12 })
      .notNull()
      .references(() => accountsTable.id),
    methodId: char('method_id', { length: 12 })
      .notNull()
      .references(() => methodsTable.id),
    primary: boolean('primary').default(false),
  },
  t => ({ pk: primaryKey({ columns: [t.accountId, t.methodId] }) }),
);

export const categoriesTable = createTable('categories', {
  id: char('id', { length: 12 }).primaryKey(),
  userId: char('user_id', { length: 12 })
    .notNull()
    .references(() => usersTable.id),
  label: varchar('label', { length: 64 }).notNull(),
  iconId: char('icon_id', { length: 12 }).references(() => iconsTable.id),
  isPublic: boolean('is_public').default(false),
  metadata: jsonb('metadata'),
});

export const payeesTable = createTable('payees', {
  id: char('id', { length: 12 }).primaryKey(),
  userId: char('user_id', { length: 12 })
    .notNull()
    .references(() => usersTable.id),
  name: varchar('name', { length: 64 }).notNull(),
  notes: text('notes'),
});

export const paymentFrequencyEnum = pgEnum('finmax_payment_frequency', [
  'weekly',
  'monthly',
  'quarterly',
  'biannually',
  'annually',
]);

export const subscriptionsTable = createTable('subscriptions', {
  id: char('id', { length: 12 }).primaryKey(),
  userId: char('user_id', { length: 12 })
    .notNull()
    .references(() => usersTable.id),
  amount: numeric('amount', { precision: 8, scale: 3 }).notNull(),
  start: timestamp('start').notNull(),
  end: timestamp('end'),
  frequency: paymentFrequencyEnum('frequency').notNull(),
  payeeId: char('payee_id', { length: 12 })
    .notNull()
    .references(() => payeesTable.id),
  methodId: char('method_id', { length: 12 })
    .notNull()
    .references(() => methodsTable.id),
  categoryId: char('category_id', { length: 12 })
    .notNull()
    .references(() => categoriesTable.id),
  accountId: char('account_id', { length: 12 })
    .notNull()
    .references(() => accountsTable.id),
  metadata: jsonb('metadata'),
});

export const iconsTable = createTable('icons', {
  id: char('id', { length: 12 }).primaryKey(),
  data: text('data').notNull(),
});
