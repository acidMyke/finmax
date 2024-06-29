'use client';

import { useEffect, useState, useRef, useContext, createContext, useMemo, useCallback, CSSProperties } from 'react';
import {
  FaCheck,
  FaChevronLeft,
  FaChevronRight,
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
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { z } from 'zod';
import AppName from './_components/AppName';
import { sleep } from './_lib/utils';

type AuthStep =
  | 'emailField'
  | 'signUpNameField'
  | 'signUpMethodSelect'
  | 'passwordField'
  | 'emailLink'
  | 'forgetPassword';

const reverseAuthStep = (step: AuthStep, isRegistered: boolean) => {
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
    case 'forgetPassword':
      return 'passwordField';
  }
};

interface AuthFlowContextData {
  email?: string;
  name?: { first: string; last: string };
  signUpMethod?: 'email-link' | 'password';
  isRegistered: boolean;
  step: AuthStep;
  stepMeta?: {
    clerkEmailId?: string;
  };
  setEmail: (email: string) => void;
  setName: (name: { first: string; last: string }) => void;
  setSignUpMethod: (method: 'email-link' | 'password') => void;
  setIsRegistered: (isRegistered: boolean) => void;
  setStep: (step: AuthStep, meta?: AuthFlowContextData['stepMeta']) => void;
}

const AuthFlowContext = createContext<AuthFlowContextData>(null as unknown as AuthFlowContextData);

export default function RootPage() {
  const [step, setStepInternal] = useState<AuthStep>('emailField');
  const [email, setEmail] = useState('');
  const [name, setName] = useState({ first: '', last: '' });
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
            signUpMethod,
            isRegistered,
            step,
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
              forgetPassword: <ForgetPassword />,
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
          // When the EmailLink component is created, it will send the email link in useEffect.
          setStep('emailLink', { clerkEmailId: ff.emailAddressId });
          return;
        }
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
      setStep('signUpNameField');
    },
  });

  return (
    <>
      <BackButton />
      <form
        className='flex h-full flex-col items-center justify-start gap-4'
        onSubmit={e => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <h2 className='mb-4 text-2xl font-bold'>Enter your email</h2>
        <form.Field
          name='email'
          children={field => (
            <label
              className='input input-bordered input-primary flex items-center data-[incorrect=true]:input-error'
              data-incorrect={field.state.meta.errors.length > 0}
            >
              <FaRegEnvelope />
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
  const { email, name, setName, setStep } = useContext(AuthFlowContext);
  const form = useForm({
    defaultValues: { first: name?.first ?? '', last: name?.last ?? '' },
    validatorAdapter: zodValidator(),
    validators: {
      onChange: z.object({
        first: z.string().min(2, 'First name must be at least 2 characters long'),
        last: z.string().min(2, 'Last name must be at least 2 characters long'),
      }),
    },
    onSubmit: ({ value: { first, last } }) => {
      setName({ first, last });
      setStep('signUpMethodSelect');
    },
  });

  return (
    <>
      <BackButton />
      <form
        className='flex h-full flex-col items-center justify-start gap-4'
        onSubmit={e => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <h2 className='mb-4 text-xl font-bold'>Enter your name</h2>
        <form.Field
          name='first'
          children={field => (
            <label
              className='input input-bordered input-primary flex items-center data-[incorrect=true]:input-error'
              data-incorrect={field.state.meta.errors.length > 0}
            >
              <input
                type='text'
                placeholder='First Name'
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
        <form.Field
          name='last'
          children={field => (
            <label
              className='input input-bordered input-primary flex items-center data-[incorrect=true]:input-error'
              data-incorrect={field.state.meta.errors.length > 0}
            >
              <input
                type='text'
                placeholder='Last Name'
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

  const form = useForm({
    defaultValues: { password: '', confirmPassword: '' },
    validatorAdapter: zodValidator(),
    validators: {
      onChange: isRegistered
        ? z.object({
            password: z.string().min(10, 'Password must be at least 10 characters long'),
          })
        : z
            .object({
              password: z.string().min(10, 'Password must be at least 10 characters long'),
              confirmPassword: z.string(),
            })
            .refine(data => data.password === data.confirmPassword, {
              path: ['confirmPassword'],
              message: 'Passwords do not match',
            }),
    },
    onSubmit: async ({ value: { password } }) => {
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
          form.setFieldMeta('password', data => ({
            ...data,
            errors: data.errors.concat(...e.errors.map(e => e.message)),
          }));
        } else {
          throw e;
        }
      }
    },
  });

  return (
    <>
      <BackButton />
      <form
        className='flex h-full flex-col items-center justify-start gap-4'
        onSubmit={e => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <h2 className='mb-4 text-xl font-bold'>{isRegistered ? 'Enter your password' : 'Create a password'}</h2>
        <form.Field
          name='password'
          children={field => (
            <label
              className='input input-bordered input-primary flex items-center data-[incorrect=true]:input-error'
              data-incorrect={field.state.meta.errors.length > 0}
            >
              <FaKey />
              <input
                type='password'
                placeholder='Password'
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
        {!isRegistered && (
          <form.Field
            name='confirmPassword'
            children={field => (
              <label
                className='input input-bordered input-primary flex items-center data-[incorrect=true]:input-error'
                data-incorrect={field.state.meta.errors.length > 0}
              >
                <FaKey />
                <input
                  type='password'
                  placeholder='Confirm Password'
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
        )}
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
      <div className='flex h-full flex-col items-center justify-start gap-2'>
        {emailState === 'delay' ? (
          <>
            <h2 className='mb-4 text-xl font-bold'>Is email correct?</h2>
            <p className='text-center'>Email: {email}</p>
            <p className='text-center'>We will send you an email shortly to verify your email address.</p>
            <button className='btn btn-success rounded-md p-2' onClick={sentAndVerifyEmail}>
              <FaCheck />
              Yes, send email
            </button>
            <button className='btn btn-error rounded-md p-2' onClick={() => setStep('emailField')}>
              <FaXmark />
              No, redo everything
            </button>
          </>
        ) : emailState === 'sent' ? (
          <>
            <h2 className='mb-4 text-xl font-bold'>Verification email sent to</h2>
            <p className='text-center'>{email}</p>
            <p className='text-center'>If you did not receive the email, please check your spam folder.</p>
            <span className='loading loading-dots loading-lg text-primary' />
          </>
        ) : emailState === 'expired' ? (
          <>
            <h2 className='mb-4 text-xl font-bold'>Email link expired</h2>
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

// #region ForgetPassword
function ForgetPassword() {
  return <div />;
}
