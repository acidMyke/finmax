'use client';

import { AiOutlineMenuFold, AiOutlineMenuUnfold } from 'react-icons/ai';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import AppName from '../_components/AppName';

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
  const { isLoaded, isSignedIn, user } = useUser();
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
            <summary className='btn btn-ghost swap group-open:swap-active'>
              <span className='swap-off'>
                <AiOutlineMenuUnfold size={20} />
              </span>
              <span className='swap-on'>
                <AiOutlineMenuFold size={20} />
              </span>
            </summary>
            <div className='dropdown-content w-52'>
              {routeDefinitions.map(def => (
                <NavButton key={def.route} {...def} />
              ))}
            </div>
          </details>
        </div>
      </header>
      <main className='px-10 py-4'>{children}</main>
    </>
  );
}
