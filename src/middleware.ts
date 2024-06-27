import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher(['/api/trpc(.*)', '/api/clerk', '/', '/verify', '/signed-out']);

export default clerkMiddleware((auth, req) => {
  const originUrl = new URL(req.url).origin;

  if (!isPublicRoute(req)) {
    console.log('Accessing protected route');
    auth().protect({
      unauthenticatedUrl: new URL('/', originUrl).href,
      unauthorizedUrl: new URL('/', originUrl).href,
    });
  }
});

export const config = {
  // The following matcher runs middleware on all routes
  // except static assets.
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
