import { TRPCError } from '@trpc/server';
import { type SQL, and, between, eq, sql } from 'drizzle-orm';
import { DateTime } from 'luxon';
import { z } from 'zod';
import { clerkClient } from '../clerk';
import { accountsTable, categoriesTable, methodsTable, transactionsTable, usersTable } from '../db/schema';
import { createTRPCRouter, publicProcedure, authenticatedProcedure } from './trpc';

// #region libs
const idSchema = z.string().length(12, 'id must be 12 characters long');
// #endregion

const usersRouter = createTRPCRouter({
  idsLabels: authenticatedProcedure.query(async ({ ctx: { auth, db } }) => {
    const { userId: clerkUserId } = auth;

    const res = await db.query.usersTable.findFirst({
      where: eq(usersTable.clerkId, clerkUserId),
      columns: { defaultAccountId: true, defaultMethodId: true, settings: true },
      with: {
        accounts: {
          columns: { id: true, label: true, currency: true, iconId: true },
        },
        methods: {
          columns: { id: true, label: true, iconId: true },
        },
        categories: {
          columns: { id: true, label: true, iconId: true },
        },
        payees: {
          columns: { id: true, label: true, accountId: true },
        },
        subscriptions: {
          columns: { id: true, label: true },
        },
      },
    });

    if (!res) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
    }
    return res;
  }),
});

const transactionsRouter = createTRPCRouter({
  summary: authenticatedProcedure
    .input(
      z
        .object({
          // Filters
          accountId: idSchema,
          categoryId: idSchema,
          dateRange: z
            .object({
              start: z.string().date(),
              end: z.string().date(),
            })
            .or(
              z.object({
                month: z.number(),
                year: z.number(),
              }),
            )
            .and(
              z.object({
                timezone: z.string().optional(),
              }),
            ),
        })
        .partial()
        .required({ dateRange: true }),
    )
    .query(async ({ input, ctx: { auth, db } }) => {
      const { userId: userClerkId } = auth;
      const { accountId, categoryId, dateRange } = input;

      let start: DateTime, end: DateTime, lStart: DateTime, lEnd: DateTime;
      if ('start' in dateRange) {
        start = DateTime.fromISO(dateRange.start, { zone: dateRange.timezone });
        end = DateTime.fromISO(dateRange.end, { zone: dateRange.timezone });
      } else {
        start = DateTime.fromObject(
          { month: dateRange.month, year: dateRange.year, day: 1 },
          { zone: dateRange.timezone },
        );
        end = start.endOf('month');
        lStart = DateTime.fromObject(
          { month: dateRange.month - 1, year: dateRange.year, day: 1 },
          { zone: dateRange.timezone },
        );
        lEnd = lStart.endOf('month');
      }
      start = start.startOf('day');
      end = end.endOf('day');

      const andArray: SQL<unknown>[] = [
        eq(usersTable.clerkId, userClerkId),
        between(transactionsTable.date, start.toJSDate(), end.toJSDate()),
      ];

      if (accountId) andArray.push(eq(accountsTable.id, accountId));
      if (categoryId) andArray.push(eq(categoriesTable.id, categoryId));

      const amountCol = transactionsTable.amount;

      const [res] = await db
        .select({
          moneyOutSum: sql<string | null>`SUM(CASE WHEN ${amountCol} < 0 THEN ${amountCol} ELSE 0 END)`.as(
            'moneyOutSum',
          ),
          moneyInSum: sql<string | null>`SUM(CASE WHEN ${amountCol} > 0 THEN ${amountCol} ELSE 0 END)`.as('moneyInSum'),
          netSum: sql<string | null>`SUM(${amountCol})`.as('netSum'),
        })
        .from(transactionsTable)
        .innerJoin(usersTable, eq(transactionsTable.userId, usersTable.id))
        .where(and(...andArray));

      if (!res) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No transactions found' });
      }

      return res;
    }),
});

const routes = {
  users: usersRouter,
  transactions: transactionsRouter,
} satisfies Parameters<typeof createTRPCRouter>[0];

export default routes;
