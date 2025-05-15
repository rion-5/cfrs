import type { LayoutServerLoad } from './$types';
import { getSession } from '$lib/server/session';
import { redirect } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ cookies, url }) => {
	const session = await getSession(cookies);
	const requiresAuth = url.pathname !== '/login';

	if (requiresAuth && !session.user) {
		const redirectTo = encodeURIComponent(url.pathname + url.search);
		throw redirect(302, `/login?redirect=${redirectTo}`);
	}

	return {
		session: session.user ? { id_no: session.user.id_no, user_name: session.user.user_name } : null
	};
};