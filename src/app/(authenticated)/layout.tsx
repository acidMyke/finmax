'use client';

import { useMemo, useRef, useState } from 'react';
import { FaCheck, FaChevronRight, FaCog, FaSignOutAlt } from 'react-icons/fa';
import { FaChevronDown } from 'react-icons/fa6';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useClerk, useUser } from '@clerk/nextjs';
import AppName from '../_components/AppName';
import { sleep } from '../_lib/utils';

interface NavButtonDef {
  route: string;
  label: string;
  children?: Omit<NavButtonDef, 'children'>[];
  isChild?: boolean;
}

const routeDefinitions = [
  {
    route: '/dashboard',
    label: 'Dashboard',
  },
  {
    route: '/transactions',
    label: 'Transactions',
    children: [
      {
        route: '/transactions/add',
        label: 'Add Transaction',
      },
    ],
  },
  {
    route: 'accounts',
    label: 'Accounts',
    children: [
      {
        route: '/accounts/add',
        label: 'Add Account',
      },
      {
        route: '/accounts/methods/add',
        label: 'Add Method',
      },
    ],
  },
  {
    route: '/categories',
    label: 'Categories',
    children: [
      {
        route: '/categories/add',
        label: 'Add Category',
      },
    ],
  },
] satisfies NavButtonDef[];

export const NavButton = (def: NavButtonDef) => {
  const ddRef = useRef<HTMLDetailsElement>(null);
  if (!def.children) {
    return (
      <li>
        <Link href={def.route} passHref legacyBehavior>
          <a>{def.label}</a>
        </Link>
      </li>
    );
  } else {
    const { children, label, ...rest } = def;
    return (
      <li>
        <details
          ref={ddRef}
          className='lg:dropdown'
          onBlur={async e => {
            if (e.currentTarget.contains(e.relatedTarget as Node)) return;
            await sleep(100);
            ddRef.current?.removeAttribute('open');
          }}
        >
          <summary>{label}</summary>
          <ul className='dropdown-content gap-y-4 rounded-lg bg-base-200 lg:menu max-lg:!relative lg:w-72'>
            <NavButton key={def.route + '-overview'} {...rest} label='Overview' />
            {def.children.map(child => (
              <NavButton key={child.route} {...child} isChild />
            ))}
          </ul>
        </details>
      </li>
    );
  }
};

interface NavButtonsProps {
  fullName?: string;
  emailAddress?: string;
  showSignOutModal: () => void;
}

export const NavButtons = ({ fullName, emailAddress, showSignOutModal }: NavButtonsProps) => (
  <>
    {routeDefinitions.map(def => (
      <NavButton key={def.route} {...def} />
    ))}
    <div className='divider !my-0 lg:hidden' />
    {/* Setting Button */}
    <li className='px-2'>
      <Link href='/settings' passHref legacyBehavior>
        <a className='!grid h-min max-h-14 grid-flow-col grid-cols-[200px_min-content_min-content] grid-rows-2 gap-0 p-0 text-start max-lg:p-2'>
          {fullName ? (
            <>
              <span className='truncate text-lg font-bold lg:text-center'>{fullName}</span>
              <span className='truncate text-xs lg:text-center'>{emailAddress}</span>
            </>
          ) : (
            <div className='loading loading-dots col-span-2 mt-4' />
          )}
          <FaCog size={20} className='row-span-2' />
          <FaChevronRight size={20} className='row-span-2' />
        </a>
      </Link>
    </li>
    {/* Sign out Button */}
    <li className='px-2'>
      <button
        className='w-full rounded-btn bg-error p-2 text-left text-error-content hover:bg-error-content hover:text-error'
        onClick={() => showSignOutModal()}
      >
        <FaSignOutAlt size={20} />
        Sign Out
      </button>
    </li>
  </>
);

export default function Authenticatedlayout({ children }: { children: React.ReactNode }) {
  const { push: redirect } = useRouter();
  const { user } = useUser();
  const [signOutState, setSignedOut] = useState<'initial' | 'signing-out' | 'signed-out'>('initial');
  const { signOut } = useClerk();
  const dropdownMenuRef = useRef<HTMLDetailsElement>(null);
  const signOutModalRef = useRef<HTMLDialogElement>(null);

  const navButtonsProp = useMemo<NavButtonsProps>(() => {
    return {
      fullName: user?.fullName ?? undefined,
      emailAddress: user?.primaryEmailAddress!.emailAddress,
      showSignOutModal: () => signOutModalRef.current?.showModal(),
    };
  }, [user]);
  // Render the header
  return (
    <>
      {/* Full Size Background */}
      {/* <div className='fixed inset-0 -z-50 bg-gradient-to-b from-primary from-15% to-base-100 to-20%' /> */}
      <header className='navbar flex min-h-min items-center justify-between bg-primary px-4 text-primary-content'>
        <div className='navbar-start min-h-min w-min'>
          <Link href='/dashboard' passHref legacyBehavior>
            <a className='btn btn-ghost min-h-min rounded-btn'>
              <AppName className='h-10 lg:h-12' color='white' />
            </a>
          </Link>
        </div>
        <div className='navbar-end flex-1'>
          <div className='group menu menu-horizontal menu-lg flex-nowrap items-center gap-4 max-lg:hidden'>
            <NavButtons {...navButtonsProp} />
          </div>
          <details
            ref={dropdownMenuRef}
            className='group dropdown dropdown-end lg:hidden'
            onBlur={e => {
              if (dropdownMenuRef.current?.contains(e.relatedTarget as Node)) return;
              dropdownMenuRef.current?.removeAttribute('open');
            }}
          >
            <summary role='button' className='btn btn-ghost btn-sm'>
              <FaChevronDown size={18} />
            </summary>
            <div className='menu dropdown-content menu-lg w-72 gap-y-4 rounded-box bg-base-200 text-left'>
              <ul>
                <NavButtons {...navButtonsProp} />
              </ul>
            </div>
          </details>
        </div>
      </header>
      <main className='h-[200vh] px-10 py-4'>{user && children}</main>

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
    </>
  );
}
