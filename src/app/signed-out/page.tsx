import { useEffect } from 'react';
import { FaCheck } from 'react-icons/fa';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppName from '../_components/AppName';
import { sleep } from '../_lib/utils';

export default function SingedOutPage() {
  const { push: redirect } = useRouter();

  useEffect(() => void sleep(3000).then(() => redirect('/')), []);

  return (
    <main className='container mx-auto flex min-h-screen flex-col items-center justify-start'>
      {/* Header with AppName */}
      <header className='navbar'>
        <Link href='/'>
          <AppName />
        </Link>
      </header>

      <section className='mt-12 flex h-80 w-[388px] flex-col items-center justify-start gap-6 rounded-lg bg-neutral-content/10 pt-6'>
        <h2 className='text-2xl font-bold'>Signed Out !!</h2>
        <div className='h-12 w-12 rounded-full bg-success p-2 text-success-content animate-in'>
          <FaCheck size='2rem' />
        </div>
        <small>You will be redirected to the home page in a few seconds.</small>
      </section>
    </main>
  );
}
