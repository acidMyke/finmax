'use client';

import { useEffect, useState, useRef, useContext, createContext, useMemo, useCallback, CSSProperties } from 'react';
import { useForm } from 'react-hook-form';
import {
  FaCheck,
  FaChevronLeft,
  FaChevronRight,
  FaEnvelope,
  FaKey,
  FaLink,
  FaRegEnvelope,
  FaSignInAlt,
  FaSignOutAlt,
  FaUndoAlt,
} from 'react-icons/fa';
import { FaXmark } from 'react-icons/fa6';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, useClerk, useSignIn, useSignUp, useUser } from '@clerk/nextjs';
import { isClerkAPIResponseError } from '@clerk/nextjs/errors';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import AppName from './_components/AppName';
import { sleep } from './_lib/utils';

type AuthStep = 'emailField' | 'signUpNameField' | 'signUpMethodSelect' | 'passwordField' | 'emailLink';

const reverseAuthStep = (step: AuthStep, isRegistered: boolean | null) => {
  switch (step) {
    case 'emailField':
      return null;
    case 'signUpNameField':
      return 'emailField';
    case 'signUpMethodSelect':
      return 'signUpNameField';
    case 'passwordField':
      return isRegistered ? 'signUpMethodSelect' : 'signUpNameField';
    case 'emailLink':
      return isRegistered ? 'passwordField' : 'signUpNameField';
  }
};

interface AuthFlowContextData {
  email: string | null;
  name: { first: string; last: string } | null;
  signUpMethod: 'email-link' | 'password' | null;
  isRegistered: boolean | null;
  step: AuthStep;
  stepMeta: {
    clerkEmailId?: string;
  } | null;
  setEmail: (email: string) => void;
  setName: (name: { first: string; last: string }) => void;
  setSignUpMethod: (method: 'email-link' | 'password') => void;
  setIsRegistered: (isRegistered: boolean) => void;
  setStep: (step: AuthStep, meta?: AuthFlowContextData['stepMeta']) => void;
}

const AuthFlowContext = createContext<AuthFlowContextData>(null as unknown as AuthFlowContextData);

export default function RootPage() {
  const [step, setStepInternal] = useState<AuthStep>('emailField');
  const [email, setEmail] = useState<AuthFlowContextData['email']>(null);
  const [name, setName] = useState<AuthFlowContextData['name']>({ first: '', last: '' });
  const [signUpMethod, setSignUpMethod] = useState<AuthFlowContextData['signUpMethod']>(null);
  const [isRegistered, setIsRegistered] = useState<AuthFlowContextData['isRegistered']>(false);
  const [stepMeta, setStepMeta] = useState<AuthFlowContextData['stepMeta']>(null);
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
            signUpMethod,
            isRegistered,
            step,
            stepMeta,
            setEmail,
            setName,
            setSignUpMethod,
            setIsRegistered,
            setStep,
          }}
        >
          {!isLoaded ? (
            <div className='skeleton h-full w-full !bg-transparent' />
          ) : isSignedIn ? (
            <SignedInPrompt />
          ) : (
            {
              emailField: <EmailForm />,
              signUpNameField: <SignUpNameForm />,
              signUpMethodSelect: <SignUpMethodSelect />,
              passwordField: <PasswordField />,
              emailLink: <EmailLink />,
            }[step]
          )}
        </AuthFlowContext.Provider>
      </section>
    </main>
  );
}

function BackButton({ disabled }: { disabled?: boolean }) {
  const { step, isRegistered, setStep } = useContext(AuthFlowContext);
  const backStep = useMemo(() => reverseAuthStep(step, isRegistered), [step, isRegistered]);
  const onClick = useCallback(() => backStep && setStep(backStep), [backStep, setStep]);

  return (
    <button
      type='button'
      className='btn btn-ghost btn-sm ml-2 mt-2 rounded-md p-2'
      disabled={!backStep || disabled}
      onClick={onClick}
    >
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
      <h2 className='mb-4 text-2xl font-bold'>Welcome back, {user.fullName}</h2>
      <button type='button' onClick={() => redirect('/dashboard')} className='btn btn-primary btn-wide rounded-md p-2'>
        <FaSignInAlt size={20} />
        Go to Dashboard
      </button>
      <button type='button' onClick={() => signOut()} className='btn btn-error btn-wide rounded-md p-2'>
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
  const { email, setEmail, setIsRegistered, setStep } = useContext(AuthFlowContext);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<{ email: string }>({
    mode: 'onChange',
    defaultValues: { email: email ?? '' },
    resolver: zodResolver(z.object({ email: z.string().email('Invalid email address') })),
  });

  const onSubmit: Parameters<typeof handleSubmit>[0] = async ({ email }) => {
    setEmail(email);
    try {
      const si = await signIn!.create({ identifier: email });
      setIsRegistered(true);
      const { supportedFirstFactors } = si;
      const passFf = supportedFirstFactors.find(ff => ff.strategy === 'password');
      if (passFf) {
        setStep('passwordField');
        return;
      }
      const ff = supportedFirstFactors.find(ff => ff.strategy === 'email_link' && ff.safeIdentifier === email) as
        | { emailAddressId: string }
        | undefined;
      if (ff) {
        setStep('emailLink', { clerkEmailId: ff.emailAddressId });
        return;
      }
      console.error('No supported auth method found', supportedFirstFactors); // This should never happen
      throw new Error('No supported auth method found');
    } catch (e) {
      if (isClerkAPIResponseError(e)) {
        const error = e.errors[0]!;
        if (error.code === 'form_identifier_not_found') {
          setIsRegistered(false);
          setStep('signUpNameField');
        }
      } else {
        throw e;
      }
    }
  };

  return (
    <>
      <BackButton />
      <form className='flex h-full flex-col items-center justify-start gap-4' onSubmit={handleSubmit(onSubmit)}>
        <h2 className='mb-4 text-2xl font-bold'>Enter your email</h2>

        <div>
          <label
            className='input input-bordered input-primary flex items-center aria-[invalid=true]:input-error'
            data-incorrect={!!errors.email}
          >
            <FaRegEnvelope />
            <input type='email' placeholder='Email' className='ml-2 grow' {...register('email')} />
          </label>
          {errors.email ? (
            <em role='alert' className='text-xs text-error'>
              {errors.email.message}
            </em>
          ) : null}
        </div>
        <button type='submit' className='btn btn-primary btn-wide rounded-md p-2' disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              Submitting
              <span className='loading loading-dots' />
            </>
          ) : (
            'Submit'
          )}
        </button>
      </form>
    </>
  );
}
// #endregion EmailForm

// #region SignUpNameForm
function SignUpNameForm() {
  const { email, name, setName, setStep } = useContext(AuthFlowContext);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<{ first: string; last: string }>({
    mode: 'onChange',
    defaultValues: { first: name?.first ?? '', last: name?.last ?? '' },
    resolver: zodResolver(
      z.object({
        first: z.string().min(2, 'First name must be at least 2 characters long'),
        last: z.string().min(2, 'Last name must be at least 2 characters long'),
      }),
    ),
  });

  const onSubmit: Parameters<typeof handleSubmit>[0] = ({ first, last }) => {
    setName({ first, last });
    setStep('signUpMethodSelect');
  };

  return (
    <>
      <BackButton />
      <form className='flex h-full flex-col items-center justify-start gap-2' onSubmit={handleSubmit(onSubmit)}>
        <h2 className='mb-2 text-xl font-bold'>Enter your name</h2>
        <div>
          <label
            className='input input-bordered input-primary flex items-center aria-[invalid=true]:input-error'
            data-incorrect={!!errors.first}
          >
            <input type='text' placeholder='First Name' className='ml-2 grow' {...register('first')} />
          </label>
          {errors.first ? (
            <em role='alert' className='text-xs text-error'>
              {errors.first.message}
            </em>
          ) : null}
        </div>
        <div>
          <label
            className='input input-bordered input-primary flex items-center aria-[invalid=true]:input-error'
            data-incorrect={!!errors.last}
          >
            <input type='text' placeholder='Last Name' className='ml-2 grow' {...register('last')} />
          </label>
          {errors.last ? (
            <em role='alert' className='text-xs text-error'>
              {errors.last.message}
            </em>
          ) : null}
        </div>
        <button type='submit' className='btn btn-primary btn-wide rounded-md p-2' disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              Submitting
              <span className='loading loading-dots' />
            </>
          ) : (
            'Submit'
          )}
        </button>
        <small className='text-xs text-neutral-content'>Email: {email}</small>
      </form>
    </>
  );
}
// #endregion

// #region SignUpMethodSelect
function SignUpMethodSelect() {
  const { email, name, setSignUpMethod, setStep } = useContext(AuthFlowContext);

  return (
    <>
      <BackButton />
      <div className='flex h-full flex-col items-center justify-start gap-4'>
        <h2 className='mb-4 text-xl font-bold'>Choose a sign up method</h2>
        <button
          type='button'
          className='group btn btn-lg btn-wide gap-2 hover:text-primary'
          onClick={() => {
            setSignUpMethod('email-link');
            setStep('emailLink');
          }}
        >
          <FaLink />
          <span className='text-lg font-bold'>Use Email link</span>
          <FaChevronRight className='duration-75 motion-safe:group-hover:animate-pulse' />
        </button>
        <button
          type='button'
          className='group btn btn-lg btn-wide gap-2 hover:text-primary'
          onClick={() => {
            setSignUpMethod('password');
            setStep('passwordField');
          }}
        >
          <FaKey />
          <span className='text-lg font-bold'>Use Password</span>
          <FaChevronRight className='duration-75 motion-safe:group-hover:animate-pulse' />
        </button>
        <div className='text-center'>
          <small className='text-xs text-neutral-content'>Email: {email}</small>
          <br />
          <small className='text-xs text-neutral-content'>
            Name: {name!.first} {name!.last}
          </small>
        </div>
      </div>
    </>
  );
}
// #endregion

// #region PasswordField
function PasswordField() {
  const { email, name, isRegistered, setStep } = useContext(AuthFlowContext);
  const { signUp, setActive } = useSignUp();
  const { signIn } = useSignIn();

  if (!email || !name) {
    throw new Error('Email and name must be set before rendering PasswordField');
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<{ password: string; confirmPassword?: string }>({
    mode: 'onChange',
    defaultValues: { password: '', confirmPassword: '' },
    resolver: zodResolver(
      z
        .object({
          password: z.string().min(10, 'Password must be at least 10 characters long'),
          confirmPassword: z.string().nullable(),
        })
        .refine(data => isRegistered || data.confirmPassword === data.password, {
          message: 'Passwords do not match',
          path: ['confirmPassword'],
        }),
    ),
  });

  const onSubmit: Parameters<typeof handleSubmit>[0] = async ({ password }) => {
    try {
      if (isRegistered) {
        // Attempt to sign in with password.
        // If fails, throw error.
        // If status = complete, set active session.
        // If incomplete, ie more steps are needed, 2FA, new password, etc, supposed to handle but not handled here.
        const attempt = await signIn!.create({ identifier: email, password });
        if (attempt.status === 'complete') {
          setActive!({ session: attempt.createdSessionId });
        } else {
          // TODO: Handle other statuses
          throw new Error(`Unhandled status for sign in attempt: ${attempt.status}`);
        }
      } else {
        // Attempt to sign up with email, name and password.
        // If throw error, means fail. ie password too weak, detected as compromised, etc. (based on setting in Clerk)
        // If status = complete, set active session. email verification is off, so no need to verify email. (not for this app)
        // If missing requirements, check if email is unverified, if so, verify email.
        // There is status of abandoned, idk what it is for.
        const attempt = await signUp!.create({
          emailAddress: email,
          password,
          firstName: name.first,
          lastName: name.last,
        });
        if (attempt.status === 'complete') {
          setActive!({ session: attempt.createdSessionId });
        } else if (attempt.status === 'missing_requirements') {
          if (attempt.unverifiedFields.includes('email_address')) {
            setStep('emailLink');
          }
          // TODO: Handle other missing requirements
        } else {
          // TODO: Handle other statuses
          throw new Error(`Unhandled status for sign up attempt: ${attempt.status}`);
        }
      }
    } catch (e) {
      if (isClerkAPIResponseError(e)) {
        const errorMsg = e.errors.map(e => e.message);
        console.error('Clerk API error:', errorMsg);
        setError('password', { message: errorMsg.join(', ') });
      } else {
        throw e;
      }
    }
  };

  return (
    <>
      <BackButton />
      <form className='flex h-full flex-col items-center justify-start gap-2' onSubmit={handleSubmit(onSubmit)}>
        <h2 className='mb-2 text-xl font-bold'>{isRegistered ? 'Enter your password' : 'Create a password'}</h2>

        <div>
          <label
            className='input input-bordered input-primary flex items-center aria-[invalid=true]:input-error'
            aria-invalid={!!errors.password}
          >
            <FaKey />
            <input type='password' placeholder='Password' className='ml-2 grow' {...register('password')} />
          </label>

          {errors.password ? (
            <em role='alert' className='text-xs text-error'>
              {errors.password.message}
            </em>
          ) : null}
        </div>
        {!isRegistered && (
          <div>
            <label
              className='input input-bordered input-primary flex items-center aria-[invalid=true]:input-error'
              data-incorrect={!!errors.confirmPassword}
            >
              <FaKey />
              <input
                type='password'
                placeholder='Confirm Password'
                className='ml-2 grow'
                {...register('confirmPassword')}
              />
            </label>
            {errors.confirmPassword ? (
              <em role='alert' className='text-xs text-error'>
                {errors.confirmPassword.message}
              </em>
            ) : null}
          </div>
        )}
        <button type='submit' className='btn btn-primary btn-wide rounded-md p-2' disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              Submitting
              <span className='loading loading-dots' />
            </>
          ) : (
            'Submit'
          )}
        </button>
        {isRegistered && (
          <button type='button' className='btn btn-ghost btn-sm' onClick={() => setStep('emailLink')}>
            Use email link instead
          </button>
        )}
        <small className='text-xs text-neutral-content'>Email: {email}</small>
      </form>
    </>
  );
}
// #endregion

// #region Email Link
function EmailLink() {
  const { email, isRegistered, stepMeta, setStep } = useContext(AuthFlowContext);
  const { signIn, setActive } = useSignIn();
  const { signUp } = useSignUp();
  type EmailState = 'delay' | 'sent' | 'expired' | 'error' | 'verified' | 'another-tab';
  const [emailState, setEmailState] = useState<EmailState>('delay');
  const cancelFuncRef =
    useRef<ReturnType<Exclude<typeof signIn, undefined>['createEmailLinkFlow']>['cancelEmailLinkFlow']>();

  const sentAndVerifyEmail = useCallback(async () => {
    if (!signIn || !signUp) {
      throw new Error('signIn and signUp must be set for EmailLink component');
    }
    const redirectUrl = `${window.location.origin}/verify`;
    let verification: typeof signIn.firstFactorVerification;
    let sessionId: typeof signIn.createdSessionId;

    setEmailState('sent');
    if (isRegistered) {
      // Sign in with email link
      if (!stepMeta?.clerkEmailId) throw new Error('clerkEmailId must be set for EmailLink component');
      const emailId = stepMeta.clerkEmailId;
      const flow = signIn.createEmailLinkFlow();
      // Store the cancel function in a ref so it can be called when the user cancel or the component unmounts
      cancelFuncRef.current = flow.cancelEmailLinkFlow;
      // Start the flow, it will end when the user click the link in their email or the link expires.
      const attempt = await flow.startEmailLinkFlow({ emailAddressId: emailId, redirectUrl });
      verification = attempt.firstFactorVerification;
      sessionId = attempt.createdSessionId;
    } else {
      // Sign up with password or not will require email verification
      const flow = signUp.createEmailLinkFlow();
      // Store the cancel function in a ref so it can be called when the user cancel or the component unmounts
      cancelFuncRef.current = flow.cancelEmailLinkFlow;
      // Start the flow, it will end when the user click the link in their email or the link expires.
      const attempt = await flow.startEmailLinkFlow({ redirectUrl }); // Email is stored internally when the sign up is started in passwordField
      verification = attempt.verifications.emailAddress;
      sessionId = attempt.createdSessionId;
    }

    if (verification.status === 'verified') {
      // if status is verified, the verification is sucessful
      if (verification.verifiedFromTheSameClient()) {
        // if email is verified from the same client use the new tab instead of the current tab
        setEmailState('another-tab');
      } else {
        // if email is verified from another client, for example a phone, use the current tab
        setEmailState('verified');
        await sleep(500); // A short delay to allow the user to see the success message :)
        setActive!({ session: sessionId });
      }
    } else if (verification.status === 'expired') {
      // if status is expired, the verification has expired, the user must request a new one
      setEmailState('expired');
    } else {
      console.error('Unexpected verification status:', verification.status);
      setEmailState('error');
    }
  }, [isRegistered, setActive, signIn, signUp, stepMeta]);

  const domain = email!.split('@')[1]!;
  const domainToInfo = {
    'gmail.com': { href: 'https://mail.google.com', name: 'Gamil' },
    'yahoo.com': { href: 'https://mail.yahoo.com', name: 'Yahoo Mail' },
    'outlook.com': { href: 'https://outlook.live.com/mail/', name: 'Outlook' },
    'hotmail.com': { href: 'https://outlook.live.com/mail/', name: 'Outlook' },
  } as Record<string, { href: string; name: string }>;

  const knownInfo = domainToInfo[domain];

  useEffect(() => {
    return () => {
      if (cancelFuncRef.current) {
        cancelFuncRef.current();
      }
    };
  }, []);

  return (
    <>
      <BackButton disabled={emailState !== 'delay'} />
      <div className='flex h-full flex-col items-center justify-start gap-2 px-4'>
        {emailState === 'delay' ? (
          <>
            <h2 className='mb-4 text-xl font-bold'>Is email correct?</h2>
            <p className='text-center'>Email: {email}</p>
            <p className='text-pretty text-center'>We will send you an email to verify your email address.</p>
            <button type='button' className='btn btn-success w-full rounded-md p-2' onClick={sentAndVerifyEmail}>
              <FaCheck />
              Yes, send email
            </button>
            <button type='button' className='btn btn-error w-full rounded-md p-2' onClick={() => setStep('emailField')}>
              <FaXmark />
              No, redo everything
            </button>
          </>
        ) : emailState === 'sent' ? (
          <>
            <h2 className='mb-4 text-xl font-bold'>Verification email sent</h2>
            <p className='text-center'>Email: {email}</p>
            <p className='text-center'>If you did not receive the email, please check your spam folder.</p>
            <span className='loading loading-dots loading-lg text-primary' />
            {knownInfo ? (
              <a href={knownInfo.href} target='_blank' rel='noreferrer' className='btn btn-primary rounded-md p-2'>
                <FaRegEnvelope />
                Open {knownInfo.name} in new tab
              </a>
            ) : null}
          </>
        ) : emailState === 'expired' ? (
          <>
            <h2 className='mb-4 text-xl font-bold'>Email link expired</h2>
            <p className='text-center'>Email: {email}</p>
            <p className='text-center'>The email link has expired.</p>
            <div className='h-12 w-12 animate-pulse rounded-full bg-error p-2 text-error-content'>
              <FaXmark size='2rem' />
            </div>
            <button className='btn btn-primary rounded-md p-2' onClick={sentAndVerifyEmail}>
              <FaUndoAlt />
              Resend email
            </button>
          </>
        ) : emailState === 'verified' ? (
          <>
            <h2 className='mb-4 text-xl font-bold'>Email verified</h2>
            <p className='text-center'>Email has been verified.</p>
            <div className='h-12 w-12 rounded-full bg-success p-2 text-success-content animate-in spin-in'>
              <FaCheck size='2rem' />
            </div>
          </>
        ) : emailState === 'another-tab' ? (
          <>
            <h2 className='mb-4 text-xl font-bold'>Email verified</h2>
            <p className='text-center'>You may close this tab and return to the previous tab.</p>
            <div className='h-12 w-12 rounded-full bg-success p-2 text-success-content animate-in spin-in'>
              <FaCheck size='2rem' />
            </div>
          </>
        ) : emailState === 'error' ? (
          <>
            <h2 className='mb-4 text-xl font-bold'>Error</h2>
            <p className='text-center'>An error occured while verifying email.</p>
            <div className='h-12 w-12 animate-pulse rounded-full bg-error p-2 text-error-content'>
              <FaXmark size='2rem' />
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}
// #endregion
