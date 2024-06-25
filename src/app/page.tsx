'use client';

import { type FormEvent, useState, useCallback, FormEventHandler, useEffect, useMemo } from 'react';
import { FaCheck, FaChevronLeft, FaChevronRight, FaCross, FaKey, FaLink, FaRegEnvelope } from 'react-icons/fa';
import { ImCross } from 'react-icons/im';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSignUp, useSignIn, useUser, useAuth } from '@clerk/nextjs';
import AppName from '~/app/_components/AppName';
import { api } from '~/trpc/react';

type UserState =
  | 'iEmailClean'
  | 'iEmailSubmitted'
  | 'iEmailError'
  | 'nameClean'
  | 'methodClean'
  | 'passwordClean'
  | 'passwordDirty'
  | 'passwordSubmitting'
  | 'passwordCorrect'
  | 'passwordIncorrect'
  | 'passwordWeak'
  | 'emailLinkSending'
  | 'emailLinkSent'
  | 'emailLinkExpired'
  | 'emailLinkVerified'
  | 'emailCodeSending'
  | 'emailCodeSent'
  | 'emailCodeExpired'
  | 'emailCodeVerified'
  | 'emailCodeIncorrect';

export default function Home() {
  const { mutate, data: userCheckData, isPending: isUserCheckPending } = api.userCheck.useMutation();
  const [userState, setUserState] = useState<UserState>('iEmailClean');
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState<{ first: string; last: string } | null>(null);
  const { isSignedIn, isLoaded } = useAuth();
  const { signIn, setActive } = useSignIn();
  const { signUp } = useSignUp();

  const suEmailFlow = signUp?.createEmailLinkFlow();
  const siEmailFlow = signIn?.createEmailLinkFlow();

  const onSubmitEmail = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const email = e.currentTarget.email.value as string;
      setEmail(email);
      setUserState('iEmailSubmitted');
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
                redirectUrl: `https://3000minipc.acidmyke.link/verify`,
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
                setTimeout(() => setActive!({ session: res.createdSessionId }), 1000); // To display the verified message
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
          setUserState('nameClean');
        },
      });
    },
    [mutate, setUserState],
  );

  const onSubmitPassword = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setUserState('passwordSubmitting');
      const password = e.currentTarget.password.value as string;
      if (password.length === 0) {
        setUserState('passwordDirty');
        return;
      }
      if (userCheckData) {
        // Existing user
        const signInAttempt = await signIn!.create({ identifier: email!, password });
        if (signInAttempt.status === 'complete') {
          setUserState('passwordCorrect');
          setTimeout(() => setActive!({ session: signInAttempt.createdSessionId }), 1000); // To display the message
        } else {
          setUserState('passwordIncorrect');
        }
      } else {
        // new user, verify email
        await signUp!.create({ emailAddress: email!, password, firstName: name!.first, lastName: name!.last });
        setUserState('emailCodeSending');
        await signUp!.prepareEmailAddressVerification({ strategy: 'email_code' });
        setUserState('emailCodeSent');
      }
    },
    [email, signIn],
  );

  const BackButton = useCallback(({ onClick }: { onClick: () => void }) => {
    return (
      <button onClick={onClick} className='btn btn-ghost btn-sm ml-2 mt-2 rounded-md p-2'>
        <FaChevronLeft />
        Back
      </button>
    );
  }, []);

  // debbugging
  useEffect(() => {
    console.log('userState:', userState);
  }, [userState]);

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
      <section className='mt-12 h-80 w-[388px] rounded-lg bg-neutral-content/10'>
        {(() => {
          switch (true) {
            case !isLoaded:
              return <span className='loading loading-spinner' />;
            case isSignedIn:
              return <RedirectToDashboard autoRedirect />;
            case userState.startsWith('iEmail'):
              return <EmailForm onSubmit={onSubmitEmail} isSubmitting={isUserCheckPending} />;
            case userState === 'nameClean':
              return (
                <>
                  <BackButton onClick={() => setUserState('iEmailClean')} />
                  <SignUpNameForm
                    name={name}
                    onName={(name: { first: string; last: string }) => {
                      setName(name);
                      setUserState('methodClean');
                    }}
                  />
                </>
              );
            case userState === 'methodClean':
              return (
                <>
                  <BackButton onClick={() => setUserState('nameClean')} />
                  <SignUpMethodSelection
                    setUserState={setUserState}
                    email={email!}
                    name={name!}
                    onEmailLinkSelect={async () => {
                      // Trigger sign up flow
                      setUserState('emailLinkSending');
                      await signUp!.create({ emailAddress: email!, firstName: name!.first, lastName: name!.last });
                      setUserState('emailLinkSent');
                      const su = await suEmailFlow!.startEmailLinkFlow({
                        redirectUrl: `https://3000minipc.acidmyke.link/verify`,
                      });
                      console.log('su:', su);
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
                          setTimeout(() => setActive!({ session: su.createdSessionId }), 1000); // To display the verified message
                        }
                      }
                    }}
                  />
                </>
              );
            case userState.startsWith('email'):
              return (
                <>
                  <BackButton
                    onClick={() => {
                      if (userState === 'emailLinkSent') {
                        if (userCheckData) siEmailFlow!.cancelEmailLinkFlow();
                        else suEmailFlow!.cancelEmailLinkFlow();
                      }
                      if (userCheckData) setUserState('iEmailClean');
                      else setUserState('methodClean');
                    }}
                  />
                  <EmailStatus
                    userState={userState}
                    email={email!}
                    onCode={code => {
                      signUp!.attemptEmailAddressVerification({ code }).then(({ status, createdSessionId }) => {
                        if (status === 'complete') {
                          setUserState('emailCodeVerified');
                          setTimeout(() => setActive!({ session: createdSessionId }), 1000);
                        } else {
                          setUserState('emailCodeIncorrect');
                        }
                      });
                    }}
                  />
                </>
              );
            case userState.startsWith('password'):
              return (
                <>
                  <BackButton
                    onClick={() => {
                      if (userCheckData) setUserState('iEmailClean');
                      else setUserState('methodClean');
                    }}
                  />
                  <PasswordForm
                    userState={userState}
                    onSubmit={onSubmitPassword}
                    isSubmitting={userState === 'passwordSubmitting'}
                  />
                </>
              );

            default:
              return <p> Error: Unknown state {userState}</p>;
          }
        })()}
      </section>
    </main>
  );
}

// #region Email form
interface EmailFormProps {
  onSubmit: FormEventHandler<HTMLFormElement>;
  isSubmitting: boolean;
  email?: string;
}

function EmailForm({ email, onSubmit, isSubmitting }: EmailFormProps) {
  return (
    <form className='mt-6 flex h-full flex-col items-center justify-start gap-6' onSubmit={onSubmit}>
      <h2 className='mb-6 text-2xl font-bold'>Enter your email</h2>
      <label className='input input-bordered input-primary flex items-center'>
        <FaRegEnvelope />
        <input
          type='email'
          name='email'
          placeholder='Email'
          className='ml-2 grow'
          required
          defaultValue={email ?? ''}
        />
      </label>
      <button type='submit' disabled={isSubmitting} className='btn btn-primary btn-wide rounded-md p-2'>
        {isSubmitting ? (
          <>
            <span className='loading loading-spinner' />
            Submitting
          </>
        ) : (
          'Submit'
        )}
      </button>
    </form>
  );
}

// #endregion

// #region Redirect to dashboard
interface RedirectToDashboardProps {
  autoRedirect: boolean;
}

function RedirectToDashboard({ autoRedirect }: RedirectToDashboardProps) {
  const { user } = useUser();
  const { push: redirect } = useRouter();

  useEffect(() => {
    if (autoRedirect) {
      setTimeout(() => {
        redirect('/summary');
      }, 5000);
    }
  }, [autoRedirect, redirect]);

  return (
    <div className='flex h-full flex-col items-center justify-center gap-6'>
      <h2 className='mb-6 text-2xl font-bold'>
        {user!.lastSignInAt ? 'Welcome back,' : 'Welcome,'} {user!.fullName}
      </h2>
      <button onClick={() => redirect('/summary')} className='btn btn-primary btn-wide rounded-md p-2'>
        {autoRedirect ? (
          <>
            <span className='loading loading-spinner' />
            Redirecting
          </>
        ) : (
          'Go to dashboard'
        )}
      </button>
    </div>
  );
}
// #endregion

// #region SignUp Method Selection
interface SignUpMethodSelectionProps {
  setUserState: (state: UserState) => void;
  email: string;
  name: { first: string; last: string };
  onEmailLinkSelect: () => void;
}

function SignUpMethodSelection({ setUserState, email, name, onEmailLinkSelect }: SignUpMethodSelectionProps) {
  return (
    <div className='flex h-full flex-col items-center justify-start gap-4'>
      <h2 className='mb-4 text-xl font-bold'>Select a method:</h2>
      <button onClick={onEmailLinkSelect} className='group btn btn-lg btn-wide gap-2 hover:text-primary'>
        <FaLink />
        <span className='text-lg font-bold'>Use email link</span>
        <FaChevronRight className='duration-75 motion-safe:group-hover:animate-pulse' />
      </button>
      <button
        onClick={() => setUserState('passwordClean')}
        className='group btn btn-lg btn-wide gap-2 hover:text-primary'
      >
        <FaKey />
        <span className='text-lg font-bold'>Use Password</span>
        <FaChevronRight className='duration-75 motion-safe:group-hover:animate-pulse' />
      </button>
      <div className='text-center'>
        <small className='text-xs text-neutral-content'>Email: {email}</small>
        <br />
        <small className='text-xs text-neutral-content'>
          Name: {name.first} {name.last}
        </small>
      </div>
    </div>
  );
}

// #endregion

// #region Email Status
interface EmailStatusProps {
  userState: UserState;
  email: string;
  onCode: (code: string) => void;
}

function EmailStatusWrapper({ children }: { children: JSX.Element[] | JSX.Element }) {
  return <div className='flex h-full flex-col items-center justify-start gap-4'>{children}</div>;
}

function EmailStatus({ userState, email, onCode }: EmailStatusProps) {
  const isCode = userState.startsWith('emailCode');
  if (userState.endsWith('Sending')) {
    return (
      <EmailStatusWrapper>
        <h2 className='mb-6 text-xl font-bold'>Sending verification {isCode ? 'link' : 'code'} email to</h2>
        <p className='w-full text-center text-lg'>{email}</p>
        <span className='loading loading-spinner loading-lg text-primary' />
      </EmailStatusWrapper>
    );
  } else if (userState.endsWith('Sent') || userState === 'emailCodeIncorrect') {
    if (isCode) {
      return (
        <EmailStatusWrapper>
          <h2 className='mb-6 text-xl font-bold'>Verification code sent to </h2>
          <p className='w-full text-center text-lg'>{email}</p>
          <form
            className='flex h-full flex-col items-center justify-start gap-6'
            onSubmit={e => {
              e.preventDefault();
              onCode(e.currentTarget.code.value);
            }}
          >
            <label className='input input-bordered input-primary flex items-center'>
              <FaKey />
              <input type='text' name='code' placeholder='******' className='ml-2 grow' required />
            </label>
            <button type='submit' className='btn btn-primary btn-wide rounded-md p-2'>
              Submit
            </button>
          </form>
        </EmailStatusWrapper>
      );
    } else {
      return (
        <EmailStatusWrapper>
          <h2 className='text-xl font-bold'>Verification email sent to</h2>
          <p className='mb-6 w-full text-center text-lg '>{email}</p>
          <p className='text-lg'>Waiting for verification</p>
          <span className='loading loading-dots loading-lg text-primary' />
        </EmailStatusWrapper>
      );
    }
  } else if (userState.endsWith('Expired')) {
    return (
      <EmailStatusWrapper>
        <h2 className='mb-6 text-xl font-bold'>Verification {isCode ? 'code' : 'link'} expired</h2>
        <p className='text-error'>Please request a new email link</p>
        <div className='h-12 w-12 animate-pulse rounded-full bg-error p-2 text-error-content'>
          <ImCross size='2rem' />
        </div>
      </EmailStatusWrapper>
    );
  } else if (userState.endsWith('Verified')) {
    return (
      <EmailStatusWrapper>
        <h2 className='mb-6 text-xl font-bold'>Email {isCode ? 'code' : 'link'} verified</h2>
        <p className='text-success'>You are now logged in</p>
        <div className='h-12 w-12 rounded-full bg-success p-2 text-success-content animate-in spin-in'>
          <FaCheck size='2rem' />
        </div>
      </EmailStatusWrapper>
    );
  }

  // return (
  //   <div className='flex h-full flex-col items-center justify-center gap-6'>
  //     {
  //       (
  //         {
  //           emailLinkSending: (
  //             <>
  //               <h2 className='mb-6 text-xl font-bold'>Sending email link...</h2>
  //               <span className='loading loading-spinner loading-lg text-primary' />
  //             </>
  //           ),
  //           emailLinkSent: (
  //             <>
  //               <h2 className='mb-6 text-xl font-bold'>Email link sent</h2>
  //               <p className='text-lg'>Waiting for verification...</p>
  //               <div className='bg-neutral text-primary rounded-full p-2'>
  //                 <span className='loading loading-dots loading-lg' />
  //               </div>
  //               <button onClick={onCancelButtonClick} className='btn btn-error btn-wide rounded-md p-2'>
  //                 Cancel
  //               </button>
  //             </>
  //           ),
  //           emailLinkExpired: (
  //             <>
  //               <h2 className='mb-6 text-xl font-bold'>Email link expired</h2>
  //               <p className='text-error'>Please request a new email link</p>
  //               <div className='bg-error text-error-content animate-pulse rounded-full p-2'>
  //                 <FaCross />
  //                 {/* TODO: Button to request new email link */}
  //               </div>
  //             </>
  //           ),
  //           emailLinkVerified: (
  //             <>
  //               <h2 className='mb-6 text-xl font-bold'>Email link verified</h2>
  //               <p className='text-success'>You are now logged in</p>
  //               <div className='bg-success text-success-content animate-in spin-in rounded-full p-2'>
  //                 <FaCheck />
  //               </div>
  //             </>
  //           ),
  //           emailLinkCancelled: (
  //             <>
  //               <h2 className='mb-6 text-xl font-bold'>Email link cancelled</h2>
  //               <p className='text-error'>Please request a new email link</p>
  //               <div className='bg-error text-error-content animate-pulse rounded-full p-2'>
  //                 <FaCross />
  //               </div>
  //             </>
  //           ),
  //         } as Record<UserState, JSX.Element>
  //       )[status]
  //     }
  //   </div>
  // );
}

// #endregion

// #region Password Form
interface PasswordFormProps {
  userState: UserState;
  onSubmit: FormEventHandler<HTMLFormElement>;
  isSubmitting: boolean;
}

function PasswordForm({ userState, onSubmit, isSubmitting }: PasswordFormProps) {
  return (
    <form className='flex h-full flex-col items-center justify-start gap-4' onSubmit={onSubmit}>
      <h2 className='mb-6 text-2xl font-bold'>Enter your password</h2>
      <label
        className='input input-bordered input-primary flex items-center data-[incorrect=true]:input-error'
        data-incorrect={userState === 'passwordIncorrect' || userState === 'passwordWeak'}
      >
        <FaKey />
        <input type='password' name='password' placeholder='Password' className='ml-2 grow' required />
      </label>
      {userState === 'passwordIncorrect' && <p className='text-sm text-error'>Incorrect password, please try again</p>}
      {userState === 'passwordWeak' && <p className='text-sm text-error'>Compromised password detected</p>}
      <button type='submit' disabled={isSubmitting} className='btn btn-primary btn-wide mt-2 rounded-md p-2'>
        {isSubmitting ? (
          <>
            <span className='loading loading-spinner' />
            Submitting
          </>
        ) : (
          'Submit'
        )}
      </button>
    </form>
  );
}

// #endregion

// #region Sign Up Name Form
interface SignUpNameFormProps {
  name: { first: string; last: string } | null;
  onName: (name: { first: string; last: string }) => void;
}

function SignUpNameForm({ name, onName }: SignUpNameFormProps) {
  return (
    <form
      className='flex h-full flex-col items-center justify-start gap-4'
      onSubmit={e => {
        e.preventDefault();
        const firstName = e.currentTarget.firstName.value;
        const lastName = e.currentTarget.lastName.value;
        onName({ first: firstName, last: lastName });
      }}
    >
      <h2 className='mb-6 text-2xl font-bold'>Enter your name</h2>
      <label className='input input-bordered input-primary flex items-center'>
        <input
          type='text'
          name='firstName'
          placeholder='First Name'
          className='ml-2 grow'
          required
          defaultValue={name?.first}
        />
      </label>
      <label className='input input-bordered input-primary flex items-center'>
        <input
          type='text'
          name='lastName'
          placeholder='Last Name'
          className='ml-2 grow'
          required
          defaultValue={name?.last}
        />
      </label>
      <button type='submit' className='btn btn-primary btn-wide rounded-md p-2'>
        Submit
      </button>
    </form>
  );
}

// #endregion
