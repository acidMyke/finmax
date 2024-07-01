'use client';

import { useMemo, useRef, useState } from 'react';
import { FaChevronLeft, FaChevronRight, FaPlus } from 'react-icons/fa';
import { useUser } from '@clerk/nextjs';
import { DateTime } from 'luxon';
import { twMerge } from 'tailwind-merge';
import { Dropdown } from '~/app/_components/Dropdown';
import api from '~lib/trpc';

export default function DashboardPage() {
  const { user } = useUser();
  const [accFilter, setAccFilter] = useState<string | undefined>(undefined);
  const [mthYrFilter, setMthYrFilter] = useState<DateTime>(DateTime.now().startOf('month'));
  const userIdsLabelsQuery = api.users.idsLabels.useQuery();
  const transactionSummaryQuery = api.transactions.summary.useQuery({
    dateRange: { month: mthYrFilter.month, year: mthYrFilter.year },
    accountId: accFilter ?? undefined,
  });
  const mthYrSelectorDdRef = useRef<HTMLDetailsElement>(null);

  const { nextMonth, previousMonth, nextDisabled } = useMemo(
    () => ({
      nextMonth: mthYrFilter.plus({ months: 1 }),
      previousMonth: mthYrFilter.minus({ months: 1 }),
      nextDisabled: mthYrFilter.startOf('month').equals(DateTime.now().startOf('month')),
    }),
    [mthYrFilter],
  );

  if (!user) {
    return null;
  }

  return (
    <>
      <h1 className='mt-6 flex'>
        <span className='flex-1 text-5xl font-semibold text-primary-content '>Hello, {user.firstName}</span>
        <button type='button' className='btn btn-neutral rounded-lg'>
          <FaPlus size={20} />
          <span className='hidden md:inline'>New Transaction</span>
        </button>
      </h1>

      <div className='mx-auto flex flex-col gap-x-4 lg:flex-row'>
        <div className='flex flex-1 flex-col gap-2'>
          {/* Display the transaction summary filters */}
          <section className='mt-6'>
            <div className='flex flex-row items-center justify-start gap-2'>
              <p className='text-lg font-semibold'>Transaction summary for</p>
              {userIdsLabelsQuery.isLoading ? (
                <div className='skeleton h-10 w-40' />
              ) : (
                <Dropdown
                  onChange={id => setAccFilter(id === 'undefined' ? undefined : id)}
                  options={[{ id: 'undefined', label: 'All Accounts' }, ...userIdsLabelsQuery.data!.accounts]}
                  classNames={{
                    summaryElement: 'min-w-40 justify-between btn-sm trucate',
                    ulElement: 'w-40 max-h-28 flex-nowrap overflow-y-auto bg-base-200 rounded-b-lg',
                  }}
                />
              )}
              <p className='text-lg font-semibold'>in the month of</p>

              <div className='join'>
                <button onClick={() => setMthYrFilter(previousMonth)} className='btn join-item btn-neutral btn-sm'>
                  <FaChevronLeft size={18} />
                </button>
                <div className='btn join-item btn-neutral no-animation btn-sm w-24 cursor-default'>
                  {mthYrFilter.toFormat('LLL yyyy')}
                </div>
                <button
                  disabled={nextDisabled}
                  onClick={() => setMthYrFilter(nextMonth)}
                  className='btn join-item btn-neutral btn-sm'
                >
                  <FaChevronRight size={18} />
                </button>
              </div>
            </div>
          </section>

          {/* Transaction Summary */}
          <section className='mt-6'>
            <div className='flex w-full flex-col justify-between gap-4 md:flex-row'>
              {transactionSummaryQuery.isLoading
                ? Array.from({ length: 3 }).map((_, i) => <div key={i} className='skeleton h-24 flex-1' />)
                : [
                    {
                      label: 'Money In',
                      elipsisColorClass: 'bg-success',
                      value: transactionSummaryQuery.data!.moneyInSum,
                    },
                    {
                      label: 'Net Cash flow',
                      elipsisColorClass: 'bg-accent',
                      value: transactionSummaryQuery.data!.netSum,
                    },
                    {
                      label: 'Money Out',
                      elipsisColorClass: 'bg-error',
                      value: transactionSummaryQuery.data!.moneyOutSum,
                    },
                  ].map(({ label, elipsisColorClass, value }) => (
                    <div
                      key={label}
                      className='grid h-24 w-full flex-1 grid-cols-[min-content] content-center items-center justify-items-start gap-2 rounded-lg border border-primary-content px-4'
                    >
                      <div className={twMerge('size-4 rounded-full', elipsisColorClass)} />
                      <p className='col-start-2 row-start-1 text-lg font-semibold'>{label}</p>
                      <p className='col-span-2 indent-2 text-2xl font-semibold'>
                        ${value?.slice(0, -1) ?? (0).toFixed(2)}
                      </p>
                    </div>
                  ))}
            </div>
          </section>
        </div>
        <div className='flex flex-1 flex-col gap-2'></div>
      </div>
    </>
  );
}
