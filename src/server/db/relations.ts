import { relations } from 'drizzle-orm';
import {
  accountsMethodsTable,
  accountsTable,
  categoriesTable,
  changesTable,
  methodsTable,
  payeesTable,
  subscriptionsTable,
  transactionsTable,
  usersTable,
} from './schema';

export const usersRelations = relations(usersTable, ({ one, many }) => ({
  changes: many(changesTable),
  transactions: many(transactionsTable),
  accounts: many(accountsTable),
  methods: many(methodsTable),
  categories: many(categoriesTable),
  payees: many(payeesTable),
  subscriptions: many(subscriptionsTable),
}));

export const changesRelations = relations(changesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [changesTable.by],
    references: [usersTable.id],
  }),
}));

export const transactionsRelations = relations(transactionsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [transactionsTable.userId],
    references: [usersTable.id],
  }),
  account: one(accountsTable, {
    fields: [transactionsTable.accountId],
    references: [accountsTable.id],
  }),
  category: one(categoriesTable, {
    fields: [transactionsTable.categoryId],
    references: [categoriesTable.id],
  }),
  method: one(methodsTable, {
    fields: [transactionsTable.methodId],
    references: [methodsTable.id],
  }),
  payee: one(payeesTable, {
    fields: [transactionsTable.payeeId],
    references: [payeesTable.id],
  }),
  subscription: one(subscriptionsTable, {
    fields: [transactionsTable.subscriptionId],
    references: [subscriptionsTable.id],
  }),
  parent: one(transactionsTable, {
    fields: [transactionsTable.parentId],
    references: [transactionsTable.id],
    relationName: 'childrens',
  }),
  childrens: many(transactionsTable, { relationName: 'childrens' }),
}));

export const accountsRelations = relations(accountsTable, ({ one, many }) => ({
  user: one(usersTable, { fields: [accountsTable.userId], references: [usersTable.id] }),
  methods: many(accountsMethodsTable),
  transactions: many(transactionsTable),
}));

export const methodsRelations = relations(methodsTable, ({ one, many }) => ({
  user: one(usersTable, { fields: [methodsTable.userId], references: [usersTable.id] }),
  accounts: many(accountsMethodsTable),
  transactions: many(transactionsTable),
}));

export const accountsMethodsRelations = relations(accountsMethodsTable, ({ one }) => ({
  account: one(accountsTable, {
    fields: [accountsMethodsTable.accountId],
    references: [accountsTable.id],
  }),
  method: one(methodsTable, {
    fields: [accountsMethodsTable.methodId],
    references: [methodsTable.id],
  }),
}));

export const categoriesRelations = relations(categoriesTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [categoriesTable.userId],
    references: [usersTable.id],
  }),
  transactions: many(transactionsTable),
}));

export const payeesRelations = relations(payeesTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [payeesTable.userId],
    references: [usersTable.id],
  }),
  account: one(accountsTable, {
    fields: [payeesTable.accountId],
    references: [accountsTable.id],
  }),
  transactions: many(transactionsTable),
  subscriptions: many(subscriptionsTable),
}));

export const subscriptionsRelations = relations(subscriptionsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [subscriptionsTable.userId],
    references: [usersTable.id],
  }),
  payee: one(payeesTable, {
    fields: [subscriptionsTable.payeeId],
    references: [payeesTable.id],
  }),
  transactions: many(transactionsTable),
}));
