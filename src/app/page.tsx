'use client';

import { useEffect, useState, useRef, useContext, createContext, useMemo, useCallback } from 'react';
import { FaChevronLeft, FaSignInAlt, FaSignOutAlt } from 'react-icons/fa';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, useClerk, useSignIn, useSignUp, useUser } from '@clerk/nextjs';
import { isClerkAPIResponseError } from '@clerk/nextjs/errors';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { validators } from 'tailwind-merge';
import { z } from 'zod';
import { api } from '~lib/trpc';
import AppName from './_components/AppName';

type AuthStep = 'emailField' | 'signUpNameField' | 'signUpMethodSelect' | 'passwordField' | 'emailLinkAwaiting';
// | 'forgetPassword';

const reverseAuthStep = (step: AuthStep, isRegistered: boolean) => {
  switch (step) {
    case 'emailField':
      return null;
    case 'signUpNameField':
      return 'emailField';
    case 'signUpMethodSelect':
      return 'signUpNameField';
    case 'passwordField':
      return isRegistered ? 'emailField' : 'signUpMethodSelect';
    case 'emailLinkAwaiting':
      return isRegistered ? 'passwordField' : 'signUpMethodSelect';
    // case 'forgetPassword':
    //   return 'emailField';
  }
};

interface AuthFlowContextData {
  email?: string;
  name?: { first: string; last: string };
  password?: string;
  signUpMethod?: 'email-link' | 'password';
  isRegistered: boolean;
  step: AuthStep;
  stepMeta?: {
    clerkEmailId?: string;
  };
  setEmail: (email: string) => void;
  setName: (name: { first: string; last: string }) => void;
  setPassword: (password: string) => void;
  setSignUpMethod: (method: 'email-link' | 'password') => void;
  setIsRegistered: (isRegistered: boolean) => void;
  setStep: (step: AuthStep, meta?: AuthFlowContextData['stepMeta']) => void;
}

const AuthFlowContext = createContext<AuthFlowContextData>(null as unknown as AuthFlowContextData);

export default function RootPage() {
  const [step, setStepInternal] = useState<AuthStep>('emailField');
  const [email, setEmail] = useState('');
  const [name, setName] = useState({ first: '', last: '' });
  const [password, setPassword] = useState('');
  const [signUpMethod, setSignUpMethod] = useState<'email-link' | 'password'>('email-link');
  const [isRegistered, setIsRegistered] = useState(false);
  const [stepMeta, setStepMeta] = useState<{ clerkEmailId?: string }>({});
  const { isLoaded, isSignedIn } = useUser();

  const setStep: AuthFlowContextData['setStep'] = useCallback(
    (step, meta) => {
      setStepInternal(step);
      setStepMeta(meta ?? {});
    },
    [setStepInternal, setStepMeta],
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
      <section className='mt-12 h-80 w-[388px] rounded-lg bg-neutral-content/10'>
        <AuthFlowContext.Provider
          value={{
            email,
            name,
            password,
            signUpMethod,
            isRegistered,
            step,
            setEmail,
            setName,
            setPassword,
            setSignUpMethod,
            setIsRegistered,
            setStep,
          }}
        >
          {!isLoaded ? (
            <div className='skeleton h-full w-full' />
          ) : isSignedIn ? (
            <SignedInPrompt />
          ) : (
            {
              emailField: <EmailForm />,
              signUpNameField: <SignUpNameForm />,
              signUpMethodSelect: <SignUpMethodSelect />,
              passwordField: <PasswordField />,
              emailLinkAwaiting: <EmailLinkAwaiting />,
            }[step]
          )}
        </AuthFlowContext.Provider>
      </section>
    </main>
  );
}

function BackButton() {
  const { step, isRegistered, setStep } = useContext(AuthFlowContext);
  const backStep = useMemo(() => reverseAuthStep(step, isRegistered), [step, isRegistered]);
  const onClick = useCallback(() => backStep && setStep(backStep), [backStep, setStep]);

  return (
    <button className='btn btn-ghost btn-sm ml-2 mt-2 rounded-md p-2' disabled={!backStep} onClick={onClick}>
      <FaChevronLeft />
      Back
    </button>
  );
}

// #region SignedInPrompt
function SignedInPrompt() {
  const { push: redirect } = useRouter();
  const { user, isSignedIn } = useUser();
  const { signOut } = useClerk();

  if (!user || !isSignedIn) {
    return null;
  }

  return (
    <div className='flex h-full flex-col items-center justify-center gap-6'>
      <h2 className='mb-6 text-2xl font-bold'>Welcome back, {user.fullName}</h2>
      <button onClick={() => redirect('/dashboard')} className='btn btn-primary btn-wide rounded-md p-2'>
        <FaSignInAlt size={20} />
        Go to Dashboard
      </button>
      <button onClick={() => signOut()} className='btn btn-error btn-wide rounded-md p-2'>
        <FaSignOutAlt size={20} />
        Sign Out
      </button>
    </div>
  );
}

// #region EmailForm
function EmailForm() {
  // const { mutate: userCheck } = api.userCheck.useMutation();
  const { signIn } = useSignIn();
  const { email, setEmail, setName, setIsRegistered, setStep } = useContext(AuthFlowContext);
  const form = useForm({
    defaultValues: { email: email ?? '' },
    validatorAdapter: zodValidator(),
    validators: {
      onChange: z.object({ email: z.string().email('Invalid email address') }),
      onChangeAsyncDebounceMs: 500,
    },
    onSubmit: async ({ value: { email } }) => {
      setEmail(email);
      try {
        // This will query clerk's FE API for user.
        // IF user exists, it will return the user's name and auth method.
        // IF user does not exist, it will throw an error.
        const si = await signIn!.create({ identifier: email });
        // user exists
        // Find their supported auth method
        const { supportedFirstFactors } = si;
        const ff = supportedFirstFactors.find(ff => ff.strategy === 'email_link' && ff.safeIdentifier === email);
        // Testing for ff.strategy === 'email_link' is a bit redundant
        // but its here because TypeScript is not smart enough to know that the find function will return a EmailLinkFactor | undefined.
        if (ff && ff.strategy === 'email_link') {
          setIsRegistered(true);
          // When the EmailLinkAwaiting component is created, it will send the email link in useEffect.
          setStep('emailLinkAwaiting', { clerkEmailId: ff.emailAddressId });
          return;
        }
      } catch (e) {
        if (isClerkAPIResponseError(e)) {
          const error = e.errors[0]!;
          if (error.code === 'form_identifier_not_found') {
            setIsRegistered(false);
            setStep('signUpNameField');
          }
        }
      }
      setStep('signUpNameField');
    },
  });

  return (
    <>
      <BackButton />
      <form
        className='flex h-full flex-col items-center justify-start gap-6'
        onSubmit={e => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <h2 className='mb-6 text-2xl font-bold'>Enter your email</h2>
        <form.Field
          name='email'
          children={field => (
            <label
              className='input input-bordered input-primary flex items-center data-[incorrect=true]:input-error'
              data-incorrect={field.state.meta.errors.length > 0}
            >
              <input
                type='email'
                placeholder='Email'
                className='ml-2 grow'
                id={field.name}
                name={field.name}
                value={field.state.value}
                onChange={e => field.handleChange(e.target.value)}
              />
              {field.state.meta.errors
                ? field.state.meta.errors.map((error, i) => (
                    <em role='alert' key={i} className='text-xs text-error'>
                      {error}
                    </em>
                  ))
                : null}
            </label>
          )}
        />
        <form.Subscribe
          selector={state => [state.isSubmitting, state.canSubmit]}
          children={([isSubmitting, canSubmit]) => (
            <button
              type='submit'
              className='btn btn-primary btn-wide rounded-md p-2'
              disabled={isSubmitting || !canSubmit}
            >
              {isSubmitting ? (
                <>
                  Submitting
                  <span className='loading loading-dots' />
                </>
              ) : (
                'Submit'
              )}
            </button>
          )}
        />
      </form>
    </>
  );
}
// #endregion EmailForm

// #region SignUpNameForm
function SignUpNameForm() {
  return <div />;
}
// #endregion

// #region SignUpMethodSelect
function SignUpMethodSelect() {
  return <div />;
}
// #endregion

// #region PasswordField
function PasswordField() {
  return <div />;
}
// #endregion

// #region EmailLinkAwaiting
function EmailLinkAwaiting() {
  return <div />;
}
// #endregion
