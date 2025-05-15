// src/routes/api/auth/logout/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { clearSession } from '$lib/server/session';

export const POST: RequestHandler = async ({ cookies }) => {
    console.log('Logout: Deleting session_token');
    clearSession(cookies);
    return json({ success: true });
};