import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

export async function requireAuth(event: RequestEvent) {
    if (!event.locals.session?.user) {
        throw json({ error: 'Unauthorized: Login required' }, { status: 401 });
    }
    return event.locals.session.user;
}