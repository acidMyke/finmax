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
  subscription: many(subscriptionsTable),
}));

export const changesRelations = relations(changesTable, ({ one }) => ({
  user: one(usersTable),
}));

export const transactionsRelations = relations(transactionsTable, ({ one, many }) => ({
  user: one(usersTable),
  account: one(accountsTable),
  category: one(categoriesTable),
  method: one(methodsTable),
  payee: one(payeesTable),
  subscription: one(subscriptionsTable),
  parent: one(transactionsTable),
  childrens: many(transactionsTable, { relationName: 'childrens' }),
}));

export const accountsRelations = relations(accountsTable, ({ one, many }) => ({
  user: one(usersTable),
  methods: many(accountsMethodsTable),
  transactions: many(transactionsTable),
}));

export const methodsRelations = relations(methodsTable, ({ one, many }) => ({
  user: one(usersTable),
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
  user: one(usersTable),
  transactions: many(transactionsTable),
}));

export const payeesRelations = relations(payeesTable, ({ one, many }) => ({
  user: one(usersTable),
  transactions: many(transactionsTable),
  subscriptions: many(subscriptionsTable),
}));

export const subscriptionsRelations = relations(subscriptionsTable, ({ one, many }) => ({
  user: one(usersTable),
  payee: one(payeesTable),
  transactions: many(transactionsTable),
}));
