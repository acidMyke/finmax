import { eq, sql } from 'drizzle-orm';
import { PgColumn, PgTableWithColumns } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { nanoid } from 'nanoid';
import { omit } from 'remeda';
import { z } from 'zod';
import { db } from '.';
import { EmptyPatchError, NotFoundInDbError } from './error';
import {
  usersTable,
  changesTable,
  transactionsTable,
  accountsTable,
  methodsTable,
  categoriesTable,
  payeesTable,
  subscriptionsTable,
  iconsTable,
} from './schema';

// This file contains all the write operations to the database that are used in the app
// which includes a changes logged in the chagnes table

// #region libs
const generateId = () => nanoid(12);

async function insertRow<
  T extends PgTableWithColumns<any>,
  TN extends string = T extends PgTableWithColumns<infer TableConfig> ? TableConfig['name'] : never,
  ColumnNames extends string = T extends PgTableWithColumns<infer TableConfig>
    ? Exclude<keyof TableConfig['columns'], 'id'>
    : never,
  InsertData extends Partial<Record<ColumnNames, any>> = {
    [K in ColumnNames]: T[K] extends PgColumn<infer ColumnConfig> ? ColumnConfig['data'] : never;
  },
>(by: string, table: T, tableName: TN, insertData: InsertData) {
  const id = generateId();
  const ret = await db
    .insert(table)
    .values({ ...insertData, id })
    .returning()
    .then(d => (d as any)[0]);

  await db.insert(changesTable).values({
    by,
    id: generateId(),
    entity: tableName,
    entityId: id,
    version: 1,
    type: 'insert',
    dataAfter: insertData,
  });

  return ret as { [K in ColumnNames]: T[K] };
}

async function patchRow<
  T extends PgTableWithColumns<any>,
  TN extends string = T extends PgTableWithColumns<infer TableConfig> ? TableConfig['name'] : never,
  ColumnNames extends string = T extends PgTableWithColumns<infer TableConfig>
    ? Exclude<keyof TableConfig['columns'], 'id'>
    : never,
  PatchData extends Partial<Record<ColumnNames, any>> = {
    [K in ColumnNames]?: T[K] extends PgColumn<infer ColumnConfig> ? ColumnConfig['data'] : never;
  },
>(by: string, table: T, tableName: TN, dataId: string, patchData: PatchData) {
  if (!Object.keys(patchData).length) throw new EmptyPatchError();
  if (table.name === 'changes') throw new Error('Cannot patch changes table');

  const selection: { [K in ColumnNames]: T[K] } = {} as { [K in ColumnNames]: T[K] };

  for (const key in patchData) {
    if (patchData[key] === undefined) delete patchData[key];
    else selection[key as unknown as ColumnNames] = table[key as unknown as ColumnNames];
  }

  const dataBefore = await db
    .select(selection)
    .from(table)
    .where(eq(table.id, dataId))
    .limit(1)
    .then(([d]) => d);

  if (!dataBefore) throw new NotFoundInDbError(tableName, dataId);

  for (const key in patchData) {
    // @ts-ignore
    if (dataBefore[key] === patchData[key]) {
      console.warn(`No change in field ${key}`);
      delete patchData[key as keyof PatchData];
      delete dataBefore[key as keyof typeof dataBefore];
    }
  }

  if (!Object.keys(patchData).length) throw new EmptyPatchError();

  const nextVersion = db.$with('nextVersion').as(
    db
      .select({ value: sql`MAX(${changesTable.version}) + 1`.as('value') })
      .from(changesTable)
      .where(eq(changesTable.entityId, dataId)),
  );

  const ret = await db
    .update(table)
    .set(patchData)
    .where(eq(table.id, dataId))
    .returning(selection)
    .then(d => (d as any)[0]);

  console.log('table', table);

  await db
    .with(nextVersion)
    .insert(changesTable)
    .values({
      id: generateId(),
      by: by,
      entity: tableName,
      entityId: dataId,
      version: sql`(select value from ${nextVersion})`,
      type: 'update',
      dataBefore,
      dataAfter: patchData,
    });

  return ret as { [K in ColumnNames]: T[K] };
}

async function deleteRow<
  T extends PgTableWithColumns<any>,
  TN extends string = T extends PgTableWithColumns<infer TableConfig> ? TableConfig['name'] : never,
  ColumnNames extends string = T extends PgTableWithColumns<infer TableConfig>
    ? Exclude<keyof TableConfig['columns'], 'id'>
    : never,
>(by: string, table: T, tableName: TN, dataId: string) {
  const [ret] = await db.delete(table).where(eq(table.id, dataId)).returning();

  if (!ret) throw new NotFoundInDbError(tableName, dataId);
  await db.insert(changesTable).values({
    id: generateId(),
    by: dataId,
    entity: tableName,
    entityId: dataId,
    version: 1,
    type: 'delete',
    dataBefore: omit(ret, ['id']),
  });

  return ret as { [K in ColumnNames]: T[K] };
}

// #endregion libs

// #region users
export const userInsertSchema = createInsertSchema(usersTable).omit({ id: true });
export type UserInsertable = z.infer<typeof userInsertSchema>;

export async function userInsert(user: UserInsertable) {
  const id = generateId();
  const ret = await db
    .insert(usersTable)
    .values({ ...user, id })
    .returning()
    .then(d => (d as any)[0]);

  await db.insert(changesTable).values({
    by: id,
    id: generateId(),
    entity: 'users',
    entityId: id,
    version: 1,
    type: 'insert',
    dataAfter: user,
  });

  return ret;
}

export const userUpdateSchema = userInsertSchema.omit({ clerkId: true }).partial();
export type UserUpdatable = Partial<Omit<UserInsertable, 'clerkId'>>;

export async function userUpdate<U extends UserUpdatable>(idOrClerkId: string, update: U) {
  const whereSql = idOrClerkId.length === 12 ? eq(usersTable.id, idOrClerkId) : eq(usersTable.clerkId, idOrClerkId);

  if (!Object.keys(update).length) throw new EmptyPatchError();

  type UserTable = typeof usersTable;
  const selection: { [K in keyof UserUpdatable]: UserTable[K] } = {} as {
    [K in keyof UserUpdatable]: UserTable[K];
  };

  for (const key in update) {
    if (!(key in usersTable)) {
      console.warn(`Field ${key} not found in users table`);
      delete update[key];
      continue;
    }
    if (update[key] === undefined) {
      delete update[key];
    }
    // @ts-ignore
    selection[key] = usersTable[key];
  }

  const dataBefore = await db
    .select({ ...selection, id: usersTable.id })
    .from(usersTable)
    .where(whereSql)
    .limit(1)
    .then(([d]) => d);

  if (!dataBefore) throw new NotFoundInDbError('users', idOrClerkId);
  const userId = dataBefore.id;

  for (const key in update) {
    // @ts-ignore
    if (dataBefore[key] === patchData[key]) {
      console.warn(`No change in field ${key}`);
      delete update[key];
      delete dataBefore[key as keyof typeof dataBefore];
    }
  }

  if (!Object.keys(update).length) throw new EmptyPatchError();

  const nextVersion = db.$with('nextVersion').as(
    db
      .select({ value: sql`MAX(${changesTable.version}) + 1`.as('value') })
      .from(changesTable)
      .where(eq(changesTable.entityId, userId)),
  );

  const ret = await db
    .update(usersTable)
    .set(update)
    .where(whereSql)
    .returning(selection)
    .then(d => (d as any)[0]);

  await db
    .with(nextVersion)
    .insert(changesTable)
    .values({
      id: generateId(),
      by: userId,
      entity: 'users',
      entityId: userId,
      version: sql`(select value from ${nextVersion})`,
      type: 'update',
      dataBefore: omit(dataBefore, ['id']),
      dataAfter: update,
    });

  return ret;
}

export async function userDelete(idOrClerkId: string) {
  const [ret] = await db
    .delete(usersTable)
    .where(idOrClerkId.length === 12 ? eq(usersTable.id, idOrClerkId) : eq(usersTable.clerkId, idOrClerkId))
    .returning();

  if (!ret) throw new NotFoundInDbError('users', idOrClerkId);
  const userId = ret.id;
  const nextVersion = db.$with('nextVersion').as(
    db
      .select({ value: sql`MAX(${changesTable.version}) + 1`.as('value') })
      .from(changesTable)
      .where(eq(changesTable.entityId, userId)),
  );

  await db
    .with(nextVersion)
    .insert(changesTable)
    .values({
      id: generateId(),
      by: userId,
      entity: 'users',
      entityId: userId,
      version: sql`(select value from ${nextVersion})`,
      type: 'delete',
      dataBefore: omit(ret, ['id']),
    });

  return ret;
}

// #endregion users
// #region transactions
export const transactionInsertSchema = createInsertSchema(transactionsTable).omit({ id: true });
export type TransactionInsertable = z.infer<typeof transactionInsertSchema>;

export async function transactionInsert(transaction: TransactionInsertable, userId: string) {
  return insertRow(userId, transactionsTable, 'transactions', { ...transaction, userId });
}

export const transactionUpdateSchema = transactionInsertSchema.partial();
export type TransactionUpdatable = Partial<TransactionInsertable>;

export async function transactionUpdate<U extends TransactionUpdatable>(
  transactionId: string,
  update: U,
  userId: string,
) {
  return patchRow(userId, transactionsTable, 'transactions', transactionId, update);
}

export async function transactionDelete(transactionId: string, userId: string) {
  return deleteRow(userId, transactionsTable, 'transactions', transactionId);
}

// #endregion transactions

// #region accounts
export const accountInsertSchema = createInsertSchema(accountsTable).omit({ id: true });
export type AccountInsertable = z.infer<typeof accountInsertSchema>;

export async function accountInsert(account: AccountInsertable, userId: string) {
  return insertRow(userId, accountsTable, 'accounts', account);
}

export const accountUpdateSchema = accountInsertSchema.partial();
export type AccountUpdatable = Partial<AccountInsertable>;

export async function accountUpdate<U extends AccountUpdatable>(accountId: string, update: U, userId: string) {
  return patchRow(userId, accountsTable, 'accounts', accountId, update);
}

export async function accountDelete(accountId: string, userId: string) {
  return deleteRow(userId, accountsTable, 'accounts', accountId);
}

// #endregion accounts

// #region methods
export const methodInsertSchema = createInsertSchema(methodsTable).omit({ id: true });
export type MethodInsertable = z.infer<typeof methodInsertSchema>;

export async function methodInsert(method: MethodInsertable, userId: string) {
  return insertRow(userId, methodsTable, 'methods', method);
}

export const methodUpdateSchema = methodInsertSchema.partial();
export type MethodUpdatable = Partial<MethodInsertable>;

export async function methodUpdate<U extends MethodUpdatable>(methodId: string, update: U, userId: string) {
  return patchRow(userId, methodsTable, 'methods', methodId, update);
}

export async function methodDelete(methodId: string, userId: string) {
  return deleteRow(userId, methodsTable, 'methods', methodId);
}

// #endregion methods

// #region categories
export const categoryInsertSchema = createInsertSchema(categoriesTable).omit({ id: true });
export type CategoryInsertable = z.infer<typeof categoryInsertSchema>;

export async function categoryInsert(category: CategoryInsertable, userId: string) {
  return insertRow(userId, categoriesTable, 'categories', category);
}

export const categoryUpdateSchema = categoryInsertSchema.partial();
export type CategoryUpdatable = Partial<CategoryInsertable>;

export async function categoryUpdate<U extends CategoryUpdatable>(categoryId: string, update: U, userId: string) {
  return patchRow(userId, categoriesTable, 'categories', categoryId, update);
}

export async function categoryDelete(categoryId: string, userId: string) {
  return deleteRow(userId, categoriesTable, 'categories', categoryId);
}

// #endregion categories

// #region payees
export const payeeInsertSchema = createInsertSchema(payeesTable).omit({ id: true });
export type PayeeInsertable = z.infer<typeof payeeInsertSchema>;

export async function payeeInsert(payee: PayeeInsertable, userId: string) {
  return insertRow(userId, payeesTable, 'payees', payee);
}

export const payeeUpdateSchema = payeeInsertSchema.partial();
export type PayeeUpdatable = Partial<PayeeInsertable>;

export async function payeeUpdate<U extends PayeeUpdatable>(payeeId: string, update: U, userId: string) {
  return patchRow(userId, payeesTable, 'payees', payeeId, update);
}

export async function payeeDelete(payeeId: string, userId: string) {
  return deleteRow(userId, payeesTable, 'payees', payeeId);
}

// #endregion payees

// #region subscriptions
export const subscriptionInsertSchema = createInsertSchema(subscriptionsTable).omit({ id: true });
export type SubscriptionInsertable = z.infer<typeof subscriptionInsertSchema>;

export async function subscriptionInsert(subscription: SubscriptionInsertable, userId: string) {
  return insertRow(userId, subscriptionsTable, 'subscriptions', subscription);
}

export const subscriptionUpdateSchema = subscriptionInsertSchema.partial();
export type SubscriptionUpdatable = Partial<SubscriptionInsertable>;

export async function subscriptionUpdate<U extends SubscriptionUpdatable>(
  subscriptionId: string,
  update: U,
  userId: string,
) {
  return patchRow(userId, subscriptionsTable, 'subscriptions', subscriptionId, update);
}

export async function subscriptionDelete(subscriptionId: string, userId: string) {
  return deleteRow(userId, subscriptionsTable, 'subscriptions', subscriptionId);
}

// #endregion subscriptions

// #region icons
export const iconInsertSchema = createInsertSchema(iconsTable).omit({ id: true });
export type IconInsertable = z.infer<typeof iconInsertSchema>;

export async function iconInsert(icon: IconInsertable, userId: string) {
  return insertRow(userId, iconsTable, 'icons', icon);
}

export const iconUpdateSchema = iconInsertSchema.partial();
export type IconUpdatable = Partial<IconInsertable>;

export async function iconUpdate<U extends IconUpdatable>(iconId: string, update: U, userId: string) {
  return patchRow(userId, iconsTable, 'icons', iconId, update);
}

export async function iconDelete(iconId: string, userId: string) {
  return deleteRow(userId, iconsTable, 'icons', iconId);
}

// #endregion icons
