import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher(['/api/trpc', '/api/clerk', '/', '/verify']);

export default clerkMiddleware((auth, req) => {
  const originUrl = new URL(req.url).origin;

  if (!isPublicRoute(req))
    auth().protect({
      unauthenticatedUrl: new URL('/', originUrl).href,
      unauthorizedUrl: new URL('/', originUrl).href,
    });
});

export const config = {
  // The following matcher runs middleware on all routes
  // except static assets.
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
