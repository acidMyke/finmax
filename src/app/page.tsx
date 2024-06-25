import Link from 'next/link';
import AppName from './_components/AppName';

export default async function Home() {
  return (
    <main className='container mx-auto flex min-h-screen flex-col items-center justify-start'>
      {/* Header with AppName */}
      <header className='navbar'>
        <Link href='/'>
          <AppName />
        </Link>
      </header>
      {/* Main content */}
      {/* Advertise the app */}
      <section className='mt-6 flex flex-col items-center justify-center'>
        <h1 className='text-center text-4xl font-bold'>The best way to manage your finances</h1>
        <p className='text-center'>Personal finance management made easy.</p>
      </section>
    </main>
  );
}
