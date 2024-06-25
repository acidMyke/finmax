'use client';

import { type FormEvent, useState, useCallback } from 'react';
import { FaChevronRight, FaKey, FaLink, FaRegEnvelope } from 'react-icons/fa';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { useClerk, useSignUp, useSignIn, useUser, useAuth } from '@clerk/nextjs';
import AppName from '~/app/_components/AppName';
import { api } from '~/trpc/react';

type UserState =
  | 'emailClean'
  | 'emailSubmitted'
  | 'emailError'
  | 'methodClean'
  | 'passwordClean'
  | 'passwordDirty'
  | 'passwordSubmitted'
  | 'passwordError'
  | 'emailLinkSending'
  | 'emailLinkSent'
  | 'emailLinkError'
  | 'emailLinkExpired'
  | 'emailLinkVerified';

export default function Home() {
  const { mutate, data: userCheckData, isPending: isUserCheckPending } = api.userCheck.useMutation();
  const [userState, setUserState] = useState<UserState>('emailClean');
  const [email, setEmail] = useState<string | null>(null);
  const [method, setMethod] = useState<Exclude<typeof userCheckData, undefined>['authMethod'] | null>(null);
  const [password, setPassword] = useState<string | null>(null);
  const { isLoaded, setActive, signUp } = useSignUp();
  const { signIn } = useSignIn();
  const { isSignedIn } = useAuth();

  const suEmailFlow = signUp?.createEmailLinkFlow();
  const siEmailFlow = signIn?.createEmailLinkFlow();

  const onSubmitEmail = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const email = e.currentTarget.email.value as string;
      setEmail(email);
      setUserState('emailSubmitted');
      mutate(email, {
        onSuccess: async user => {
          // existing user, check if using password, or email link / OTP
          if (user.authMethod === 'email-link') {
            setUserState('emailLinkSending');
            const si = await signIn!.create({ identifier: email! });
            const siff = si.supportedFirstFactors.find(
              ff => ff.strategy === 'email_link' && ff.safeIdentifier === email,
            );
            if (siff && 'emailAddressId' in siff) {
              const res = await siEmailFlow!.startEmailLinkFlow({
                emailAddressId: siff.emailAddressId,
                redirectUrl: `${window.location.origin}/verify`,
              });
              const verification = res.firstFactorVerification;
              if (verification.status === 'expired') {
                setUserState('emailLinkExpired');
              } else if (verification.verifiedFromTheSameClient()) {
                // User is verified and logined in another tab so close this tab
                window.close();
              } else {
                // User is verified on another device
                setUserState('emailLinkVerified');
                setTimeout(() => redirect('/summary'), 5000);
              }
            } else user.authMethod = 'password'; // fall back to password, email not found
          }
          if (user.authMethod === 'password') {
            setUserState('passwordClean');
          } else {
          }
        },
        onError: () => {
          // User not found,
          setUserState('methodClean');
        },
      });
    },
    [mutate, setUserState],
  );

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
      {/* Sign in / Sign up */}
      <section className='bg-neutral-content/10 mt-12 h-80 w-[388px] rounded-lg pt-6'>
        {!isLoaded ? (
          <span className='loading loading-spinner' />
        ) : isSignedIn ? (
          <div className='flex h-full flex-col items-center justify-center gap-6'>
            <h2 className='mb-6 text-2xl font-bold'>You are already signed in</h2>
            <button
              onClick={() => {
                redirect('/summary');
              }}
              className='btn btn-primary btn-wide rounded-md p-2'
            >
              Go to dashboard
            </button>
          </div>
        ) : ['emailClean', 'emailError', 'emailSubmitted'].includes(userState) ? (
          <form className='justifystart flex h-full flex-col items-center gap-6' onSubmit={onSubmitEmail}>
            <h2 className='mb-6 text-2xl font-bold'>Enter your email</h2>
            <label className='input input-bordered input-primary flex items-center'>
              <FaRegEnvelope />
              <input type='email' name='email' placeholder='Email' className='ml-2 grow' required />
            </label>
            <button type='submit' disabled={isUserCheckPending} className='btn btn-primary btn-wide rounded-md p-2'>
              {isUserCheckPending ? (
                <>
                  <span className='loading loading-spinner' />
                  Submitting
                </>
              ) : (
                'Submit'
              )}
            </button>
          </form>
        ) : userState === 'methodClean' ? (
          <div className='flex h-full flex-col items-center justify-start gap-6'>
            <h2 className='mb-6 text-xl font-bold'>Select a method:</h2>
            <button
              onClick={async () => {
                // Trigger sign up flow
                setUserState('emailLinkSending');
                await signUp!.create({ emailAddress: email! });
                setUserState('emailLinkSent');
                const su = await suEmailFlow!.startEmailLinkFlow({ redirectUrl: `${window.location.origin}/verify` });
                const verification = su.verifications.emailAddress;
                if (verification.status === 'expired') {
                  setUserState('emailLinkExpired');
                } else if (su.status === 'complete') {
                  if (verification.verifiedFromTheSameClient()) {
                    // User is verified and logined in another tab so close this tab
                    window.close();
                  } else {
                    // User is verified on another device
                    setUserState('emailLinkVerified');
                    setTimeout(() => redirect('/summary'), 5000);
                  }
                }
              }}
              className='btn btn-wide btn-lg hover:text-primary group gap-2'
            >
              <FaLink />
              <span className='text-lg font-bold'>Use email link</span>
              <FaChevronRight className='duration-75 motion-safe:group-hover:animate-pulse' />
            </button>
            <button
              onClick={() => {
                setMethod('password');
                setUserState('passwordClean');
              }}
              className='btn btn-wide btn-lg hover:text-primary group gap-2'
            >
              <FaKey />
              <span className='text-lg font-bold'>Use Password</span>
              <FaChevronRight className='duration-75 motion-safe:group-hover:animate-pulse' />
            </button>
          </div>
        ) : null}
      </section>
    </main>
  );
}
