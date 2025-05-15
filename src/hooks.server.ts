// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';
import { getSession } from '$lib/server/session';

export const handle: Handle = async ({ event, resolve }) => {
    const session = await getSession(event.cookies);
    event.locals.session = session;
    console.log('Hooks: Session:', session);

    // 보호된 경로 검증
    const protectedPaths = ['/reading', '/study', '/lecture'];
    // if (event.url.pathname.startsWith('/lecture') && !session.user) {
    if (protectedPaths.some((path) => event.url.pathname.startsWith(path)) && !session.user) {
        console.log(`Hooks: Unauthorized access to ${event.url.pathname}`);
        return Response.redirect(`${event.url.origin}/login?redirect=${encodeURIComponent(event.url.pathname)}`, 303);

    }

    return resolve(event);
};