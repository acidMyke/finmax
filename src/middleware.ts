import { NextResponse } from 'next/server';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { env } from './env';

const isPublicRoute = createRouteMatcher(['/api/trpc(.*)', '/api/clerk', '/', '/verify', '/signed-out']);

export default clerkMiddleware((getAuth, req) => {
  const auth = getAuth();

  if (!isPublicRoute(req)) {
    console.log('Accessing protected route');
    if (auth.userId === null) {
      console.log('Unauthenticated user, redirecting to /');
      return NextResponse.redirect(new URL('/', req.url));
    }
  }
});

export const config = {
  // The following matcher runs middleware on all routes
  // except static assets.
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
