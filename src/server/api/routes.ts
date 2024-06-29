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

// #region userCheck
const userCheckProcedure = publicProcedure
  .input(z.object({ email: z.string().email() }))
  .mutation(async ({ input: { email } }) => {
    // Check if user exists
    const usersRes = await clerkClient.users.getUserList({ emailAddress: [email] });
    if (usersRes.totalCount === 0 || !usersRes.data[0]) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
    }

    const { fullName, passwordEnabled, emailAddresses } = usersRes.data[0];

    if (passwordEnabled) {
      return { authMethod: 'password', fullName } as const;
    } else if (emailAddresses.length > 0) {
      const isCurrentEmailVerified =
        emailAddresses.find(emailAddress => emailAddress.emailAddress === email)?.verification?.status === 'verified';
      if (isCurrentEmailVerified) {
        return { authMethod: 'email-link', fullName } as const;
      } else {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Email not verified' });
      }
    } else {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'No auth method available' });
    }
  });

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
        .optional(),
    )
    .query(async ({ input, ctx: { auth, db } }) => {
      const { userId: userClerkId } = auth;
      const { accountId, categoryId, dateRange } = input ?? {};

      const whereArray: SQL<unknown>[] = [eq(usersTable.clerkId, userClerkId)];
      if (accountId) whereArray.push(eq(accountsTable.id, accountId));
      if (categoryId) whereArray.push(eq(categoriesTable.id, categoryId));
      if (dateRange) {
        // const start = ('start' in dateRange ? DateTime.fromISO(dateRange.start) : DateTime.fromObject({ month: dateRange.month, year: dateRange.year, day: 1 }));
        let start: DateTime, end: DateTime;
        if ('start' in dateRange) {
          start = DateTime.fromISO(dateRange.start, { zone: dateRange.timezone });
          end = DateTime.fromISO(dateRange.end, { zone: dateRange.timezone });
        } else {
          start = DateTime.fromObject(
            { month: dateRange.month, year: dateRange.year, day: 1 },
            { zone: dateRange.timezone },
          );
          end = start.endOf('month');
        }
        start = start.startOf('day');
        end = end.endOf('day');

        whereArray.push(between(transactionsTable.date, start.toJSDate(), end.toJSDate()));
      }

      const amountCol = transactionsTable.amount;

      const [res] = await db
        .select({
          moneyOutSum: sql<number>`-SUM(CASE WHEN ${amountCol} < 0 THEN ${amountCol} ELSE 0 END)`.as('moneyOutSum'),
          moneyInSum: sql<number>`SUM(CASE WHEN ${amountCol} > 0 THEN ${amountCol} ELSE 0 END)`.as('moneyInSum'),
          netSum: sql<number>`SUM(${amountCol})`.as('netSum'),
        })
        .from(transactionsTable)
        .innerJoin(usersTable, eq(transactionsTable.userId, usersTable.id))
        .where(and(eq(usersTable.clerkId, userClerkId), ...whereArray));

      if (!res) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      }

      return res;
    }),
});

const routes = {
  userCheck: userCheckProcedure,
  users: usersRouter,
  transactions: transactionsRouter,
} satisfies Parameters<typeof createTRPCRouter>[0];

export default routes;
