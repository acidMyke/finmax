// This script is supposed to be run only once with tsx to seed the development database with some initial data.
import { rand, randNumber } from '@ngneat/falso';
import { DateTime } from 'luxon';
import { nanoid } from 'nanoid';
import { env } from 'process';
import { db } from '.';
import {
  usersTable,
  accountsTable,
  methodsTable,
  categoriesTable,
  transactionsTable,
  changesTable,
  accountsMethodsTable,
  payeesTable,
} from './schema';
import { transactionInsert } from './writeOps';

const generateId = () => nanoid(12);
const systemUserId = 'system000000';

type ChangesInsert = typeof changesTable._.inferInsert;

async function seedAnyDatabase() {
  // Data that is needed in all environments
  await db.insert(usersTable).values({ id: systemUserId, clerkId: nanoid(32) });
  // Create the public categories
  const categories = [
    { id: generateId(), userId: systemUserId, label: 'Food', isPublic: true },
    { id: generateId(), userId: systemUserId, label: 'Transport', isPublic: true },
    { id: generateId(), userId: systemUserId, label: 'Utilities', isPublic: true },
    { id: generateId(), userId: systemUserId, label: 'Entertainment', isPublic: true },
    { id: generateId(), userId: systemUserId, label: 'Health', isPublic: true },
    { id: generateId(), userId: systemUserId, label: 'Education', isPublic: true },
    { id: generateId(), userId: systemUserId, label: 'Shopping', isPublic: true },
    { id: generateId(), userId: systemUserId, label: 'Investment', isPublic: true },
    { id: generateId(), userId: systemUserId, label: 'Donation', isPublic: true },
    { id: generateId(), userId: systemUserId, label: 'Salary', isPublic: true },
    { id: generateId(), userId: systemUserId, label: 'Dividend', isPublic: true },
    { id: generateId(), userId: systemUserId, label: 'Interest', isPublic: true },
    { id: generateId(), userId: systemUserId, label: 'Gift', isPublic: true },
    { id: generateId(), userId: systemUserId, label: 'Exchange', isPublic: true },
    { id: generateId(), userId: systemUserId, label: 'Others', isPublic: true },
  ] satisfies (typeof categoriesTable._.inferInsert)[];

  await db.insert(categoriesTable).values(categories);

  // Generate the changes for the categories
  await db.insert(changesTable).values(
    categories.map(
      (category): ChangesInsert => ({
        id: generateId(),
        by: systemUserId,
        version: 1,
        type: 'insert',
        entity: 'categories',
        entityId: category.id,
        dataAfter: category,
      }),
    ),
  );
}

async function seedDevelopmentDatabase() {
  // Data that is only needed in development
  // Fake transactions for user zlgf45fzw-is
  const userId = 'zlgf45fzw-is';

  const categories = await db
    .select({ id: categoriesTable.id })
    .from(categoriesTable)
    .then(rows => rows.map(row => row.id));

  const accounts = [
    { id: generateId(), userId, label: 'DBS Main', currency: 'SGD' },
    { id: generateId(), userId, label: 'Revolut SGD', currency: 'SGD' },
    { id: generateId(), userId, label: 'Revolut USD', currency: 'USD' },
    { id: generateId(), userId, label: 'Revolut JPY', currency: 'JPY' },
  ] satisfies (typeof accountsTable._.inferInsert)[];

  await db.insert(accountsTable).values(accounts);
  await db.insert(changesTable).values(
    accounts.map(
      (d): ChangesInsert => ({
        id: generateId(),
        by: userId,
        version: 1,
        type: 'insert',
        entity: 'accounts',
        entityId: d.id,
        dataAfter: d,
      }),
    ),
  );

  const methods = [
    { id: generateId(), userId, label: 'DBS Debit Card 1234', autoRegex: '1234' },
    { id: generateId(), userId, label: 'Revolut Card 5678', autoRegex: '5678' },
    { id: generateId(), userId, label: 'Transfer' },
    { id: generateId(), userId, label: 'Paynow' },
    { id: generateId(), userId, label: 'DBS Paylah' },
  ] satisfies (typeof methodsTable._.inferInsert)[];

  await db.insert(methodsTable).values(methods);
  await db.insert(changesTable).values(
    methods.map(
      (d): ChangesInsert => ({
        id: generateId(),
        by: userId,
        version: 1,
        type: 'insert',
        entity: 'methods',
        entityId: d.id,
        dataAfter: d,
      }),
    ),
  );

  const accountMethods = [
    // DBS Main can DBS Debit Card 1234, Transfer, Paynow, DBS Paylah
    { accountId: accounts[0]!.id, methodId: methods[0]!.id, primary: true },
    { accountId: accounts[0]!.id, methodId: methods[2]!.id },
    { accountId: accounts[0]!.id, methodId: methods[3]!.id },
    { accountId: accounts[0]!.id, methodId: methods[4]!.id },
    // Revolut SGD can Revolut Card 5678, Transfer, Paynow
    { accountId: accounts[1]!.id, methodId: methods[1]!.id, primary: true },
    { accountId: accounts[1]!.id, methodId: methods[2]!.id },
    { accountId: accounts[1]!.id, methodId: methods[3]!.id },
    // Revolut USD can Transfer
    { accountId: accounts[2]!.id, methodId: methods[2]!.id, primary: true },
    // Revolut JPY can Transfer
    { accountId: accounts[3]!.id, methodId: methods[2]!.id, primary: true },
  ] satisfies (typeof accountsMethodsTable._.inferInsert)[];

  await db.insert(accountsMethodsTable).values(accountMethods);

  const payees = [
    { id: generateId(), userId, accountId: accounts[2]!.id, label: 'Transfer to Revolut USD' },
    { id: generateId(), userId, label: 'McDonalds' },
    { id: generateId(), userId, label: 'Starbucks' },
  ] satisfies (typeof payeesTable._.inferInsert)[];

  await db.insert(payeesTable).values(payees);
  await db.insert(changesTable).values(
    payees.map(
      (d): ChangesInsert => ({
        id: generateId(),
        by: userId,
        version: 1,
        type: 'insert',
        entity: 'payees',
        entityId: d.id,
        dataAfter: d,
      }),
    ),
  );

  const transactions: (typeof transactionsTable._.inferInsert)[] = [];

  // Generate random transactions within the last 3 weeks
  const now = DateTime.now();
  const bankSelection = [0, 1, 2, 3];
  const methodSelection = [[0, 2, 3, 4], [1, 2, 3], [2], [2]];
  for (let i = 0; i < 70; i++) {
    const bank = rand(bankSelection);
    let amount = randNumber({ min: 900, max: 100000 }).toString();
    if (Math.random() > 0.3) {
      amount = `-${amount}`;
    }

    transactions.push({
      id: generateId(),
      userId,
      accountId: accounts[bank]!.id,
      categoryId: rand(categories),
      methodId: methods[rand(methodSelection[bank]!)]!.id,
      amount: `${amount.slice(0, -3)}.${amount.slice(-3)}`, // Add decimal point to the amount
      date: now.minus({ hours: randNumber({ min: 0, max: 3 * 7 * 24 }), minutes: randNumber({ max: 59 }) }).toJSDate(),
      payeeId: rand(payees).id,
      description: 'Random transaction',
    });
  }

  await db.insert(transactionsTable).values(transactions);
  await db.insert(changesTable).values(
    transactions.map(
      (d): ChangesInsert => ({
        id: generateId(),
        by: userId,
        version: 1,
        type: 'insert',
        entity: 'transactions',
        entityId: d.id,
        dataAfter: d,
      }),
    ),
  );
}

async function seedProductionDatabase() {
  // Data that is needed in all production environments
}

try {
  // await seedAnyDatabase();
  if (env.NODE_ENV === 'development') {
    await seedDevelopmentDatabase();
  } else {
    await seedProductionDatabase();
  }
} catch (error) {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(error);
  }
} finally {
  // Close the database connection
}
