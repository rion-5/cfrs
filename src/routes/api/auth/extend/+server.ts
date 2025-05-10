// src/routes/api/auth/extend/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { extendSession } from '$lib/server/session';

export const GET: RequestHandler = async ({ cookies }) => {
	const extended = extendSession(cookies);
	if (!extended) {
		return json({ message: '세션이 존재하지 않습니다.' }, { status: 401 });
	}
	return json({ success: true });
};