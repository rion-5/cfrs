// src/hooks.server.ts
import { getSession } from '$lib/server/session';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  // console.log('hooks.server.ts 실행:', event.url.pathname);
  const session = await getSession(event.request);
  event.locals.session = session;
  const protectedPaths = ['/reading', '/study', '/lecture'];
  if (protectedPaths.some((path) => event.url.pathname.startsWith(path))) {
    if (!session.user) {
      return Response.redirect(`${event.url.origin}/login?redirect=${encodeURIComponent(event.url.pathname)}`, 303);
    }
  }

  return resolve(event);
};