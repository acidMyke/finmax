'use client';

import { FaPlus } from 'react-icons/fa';
import { useUser } from '@clerk/nextjs';
import api from '~lib/trpc';

export default function DashboardPage() {
  const { user } = useUser();

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
    </>
  );
}
