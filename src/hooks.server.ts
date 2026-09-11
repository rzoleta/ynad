import { redirect, type Handle } from '@sveltejs/kit';
import { building } from '$app/environment';
import { getAuth } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
  if (building) return resolve(event);

  const auth = getAuth();

  if (event.url.pathname.startsWith('/api/auth')) {
    return auth.handler(event.request);
  }

  const session = await auth.api.getSession({ headers: event.request.headers });
  if (session) {
    event.locals.session = session.session;
    event.locals.user = session.user;
  }

  if (event.url.pathname.startsWith('/app') && !event.locals.user) {
    redirect(302, '/');
  }

  const response = await resolve(event);

  if (event.url.pathname.startsWith('/app')) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  }

  return response;
};
