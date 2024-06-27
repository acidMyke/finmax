'use client';

import { useRef, useState } from 'react';
import { FaCheck, FaChevronRight, FaCog, FaSignOutAlt } from 'react-icons/fa';
import { FaChevronDown } from 'react-icons/fa6';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useClerk, useUser } from '@clerk/nextjs';
import AppName from '../_components/AppName';
import { sleep } from '../_lib/utils';

const routeDefinitions = [
  {
    route: '/dashboard',
    label: 'Dashboard',
  },
  {
    route: '/transactions',
    label: 'Transactions',
  },
  {
    route: 'accounts',
    label: 'Accounts',
  },
  {
    route: '/categories',
    label: 'Categories',
  },
];

export const NavButton = (def: (typeof routeDefinitions)[number]) => {
  return (
    <Link href={def.route} passHref legacyBehavior>
      <a className='btn btn-ghost text-primary-content'>{def.label}</a>
    </Link>
  );
};

export default function Authenticatedlayout({ children }: { children: React.ReactNode }) {
  const { push: redirect } = useRouter();
  const { user } = useUser();
  const [signOutState, setSignedOut] = useState<'initial' | 'signing-out' | 'signed-out'>('initial');
  const { signOut } = useClerk();
  const signOutModalRef = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();

  // Render the header
  return (
    <>
      <header className='navbar min-h-min bg-primary px-4 text-primary-content'>
        <div className='navbar-start min-h-min'>
          <Link href='/dashboard' passHref legacyBehavior>
            <a className='btn btn-ghost min-h-min rounded-btn'>
              <AppName className='h-10' />
            </a>
          </Link>
        </div>
        <div className='navbar-end'>
          <details className='group dropdown dropdown-end'>
            <summary className='btn btn-ghost transition-transform duration-200 group-open:rotate-180'>
              <FaChevronDown size={20} />
            </summary>
            <div className='menu dropdown-content gap-y-4 rounded-lg bg-base-200'>
              {routeDefinitions.map(def => (
                <NavButton key={def.route} {...def} />
              ))}
              <div className='divider !my-0' />
              {/* Indicate signin as */}
              <Link href='/settings' passHref legacyBehavior>
                <a className='btn btn-ghost grid grid-flow-col grid-rows-2 p-2'>
                  <span className='text-start text-lg font-bold'>{user?.fullName}</span>
                  <span className='text-xs'>{user?.primaryEmailAddress?.emailAddress}</span>
                  <FaCog size={20} className='row-span-2' />
                  <FaChevronRight size={20} className='row-span-2' />
                </a>
              </Link>
              <button
                onClick={() => {
                  signOutModalRef.current?.showModal();
                }}
                className='btn btn-error'
              >
                <FaSignOutAlt size={20} /> Sign Out
              </button>
              <dialog ref={signOutModalRef} className='modal overflow-visible'>
                <div className='modal-box'>
                  <h3 className='mb-4 text-lg font-bold'>Are you sure you want to sign out?</h3>
                  {signOutState === 'initial' ? (
                    <div className='modal-action'>
                      <button
                        className='btn btn-error transition-[width]'
                        onClick={async () => {
                          setSignedOut('signing-out');
                          await sleep(500);
                          await signOut();
                          setSignedOut('signed-out');
                          await sleep(500);
                          redirect('/signed-out');
                        }}
                      >
                        Yes
                      </button>
                      <button onClick={() => signOutModalRef.current?.close()} className='btn btn-success'>
                        No
                      </button>
                    </div>
                  ) : signOutState === 'signing-out' ? (
                    <div className='flex flex-col items-center justify-center'>
                      <span className='loading loading-spinner loading-lg' />
                      <span className='text-lg'>Signing out...</span>
                    </div>
                  ) : (
                    signOutState === 'signed-out' && (
                      <div className='flex flex-col items-center justify-center'>
                        <FaCheck size={20} className='animate-in spin-in-6' />
                        <span className='text-lg'>Signed out</span>
                      </div>
                    )
                  )}
                </div>
              </dialog>
            </div>
          </details>
        </div>
      </header>
      <main className='bg-gradient-to-b from-primary to-base-100 to-10% px-10 py-4'>{children}</main>
    </>
  );
}
