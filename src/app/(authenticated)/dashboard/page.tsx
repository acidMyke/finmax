'use client';

import { useMemo, useRef, useState } from 'react';
import { FaChevronLeft, FaChevronRight, FaPlus } from 'react-icons/fa';
import { LuArrowUpRight } from 'react-icons/lu';
import { useUser } from '@clerk/nextjs';
import { DateTime } from 'luxon';
import { Dropdown } from '~/app/_components/Dropdown';
import api from '~lib/trpc';

export default function DashboardPage() {
  const { user } = useUser();
  const [accFilter, setAccFilter] = useState<string | null>(null);
  const [mthYrFilter, setMthYrFilter] = useState<DateTime>(DateTime.now().startOf('month'));
  const userIdsLabelsQuery = api.users.idsLabels.useQuery();
  const transactionSummaryQuery = api.transactions.summary.useQuery({
    dateRange: { month: mthYrFilter.month, year: mthYrFilter.year },
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

      {/* Display the transaction summary filters */}
      <section className='mt-6'>
        <div className='flex flex-row items-center justify-start gap-2'>
          <p className='text-lg font-semibold'>Transaction summary for</p>
          {userIdsLabelsQuery.isLoading ? (
            <div className='skeleton h-10 w-40' />
          ) : (
            <Dropdown
              onChange={setAccFilter}
              options={userIdsLabelsQuery.data!.accounts}
              classNames={{
                summaryElement: 'min-w-40 justify-between btn-sm trucate ',
                ulElement: 'w-40 max-h-28 flex-nowrap overflow-y-auto',
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
        <div className='flex w-full flex-col lg:flex-row'>
          {transactionSummaryQuery.isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <div key={i} className='skeleton flex-1' />)
          ) : (
            <>
              <div className='grid flex-1 grid-cols-2 gap-2 rounded-lg p-2 max-lg:w-full lg:h-full'>
                <div className='size-4 rounded-full bg-success' />
                <p className='text-lg font-semibold'>Money In</p>
                <p className='col-span-2 text-lg font-semibold'>{transactionSummaryQuery.data!.moneyInSum}</p>
              </div>
              <div className='grid flex-1 grid-cols-2 gap-2 rounded-lg p-2 max-lg:w-full lg:h-full'>
                <div className='size-4 rounded-full bg-accent' />
                <p className='text-lg font-semibold'>Net </p>
                <p className='col-span-2 text-lg font-semibold'>{transactionSummaryQuery.data!.netSum}</p>
              </div>
              <div className='grid flex-1 grid-cols-2 gap-2 rounded-lg p-2 max-lg:w-full lg:h-full'>
                <div className='size-4 rounded-full bg-error' />
                <p className='text-lg font-semibold'>Money Out</p>
                <p className='col-span-2 text-lg font-semibold'>{transactionSummaryQuery.data!.moneyOutSum}</p>
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
