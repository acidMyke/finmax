'use client';

import { useEffect, useState } from 'react';
import { FaCheck } from 'react-icons/fa';
import { ImCross } from 'react-icons/im';
import Link from 'next/link';
import { useClerk } from '@clerk/nextjs';
import { EmailLinkErrorCode, isEmailLinkError } from '@clerk/nextjs/errors';
import AppName from '../_components/AppName';

export default function VerifyPage() {
  const { handleEmailLinkVerification } = useClerk();
  const [vStatus, setVStatus] = useState<'loading' | 'expired' | 'verified' | 'failed'>('loading');

  useEffect(() => {
    handleEmailLinkVerification({
      redirectUrl: '/',
      redirectUrlComplete: '/summary',
    })
      .then(() => {
        setVStatus('verified');
        // This is the other device, the auth is complete
      })
      .catch(err => {
        setVStatus(isEmailLinkError(err) && err.code === EmailLinkErrorCode.Expired ? 'expired' : 'failed');
      });
  }, []);

  return (
    <main className='container mx-auto flex min-h-screen flex-col items-center justify-start'>
      {/* Header with AppName */}
      <header className='navbar'>
        <Link href='/'>
          <AppName />
        </Link>
      </header>

      <section className='mt-12 flex h-80 w-[388px] flex-col items-center justify-start gap-6 rounded-lg bg-neutral-content/10 pt-6'>
        {vStatus === 'loading' && (
          <>
            <h2 className='text-2xl font-bold'>
              Verifying <span className='loading loading-dots' />{' '}
            </h2>
          </>
        )}
        {vStatus === 'expired' && (
          <>
            <h2 className='text-2xl font-bold'>Email verification link expired</h2>
            <p className='text-error'>Please request a new email link</p>
            <div className='h-12 w-12 animate-pulse rounded-full bg-error p-2 text-error-content'>
              <ImCross size='2rem' />
            </div>
          </>
        )}
        {vStatus === 'verified' && (
          <>
            <h2 className='text-2xl font-bold'>Email verified</h2>
            <div className='h-12 w-12 rounded-full bg-success p-2 text-success-content animate-in'>
              <FaCheck size='2rem' />
            </div>
            <p className='text-neutral-content'>This window will close in 5 seconds</p>
          </>
        )}
        {vStatus === 'failed' && (
          <>
            <h2 className='text-2xl font-bold'>Email verification failed</h2>
            <p className='text-neutral-content'>Please request a new verification link.</p>
            <div className='h-12 w-12 animate-pulse rounded-full bg-error p-2 text-error-content'>
              <ImCross size='2rem' />
            </div>
          </>
        )}
      </section>
    </main>
  );
}
