// src/routes/api/auth/session/+server.ts

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {setSession } from '$lib/server/session';

export const POST: RequestHandler = async ({request, cookies}) => {
    const {id_no, user_name } = await request.json();
    if(!id_no || !user_name) {
        return json ({error: 'Invalid data'}, {status: 400});
    }
    setSession(cookies, {id_no, user_name});
    return json({success:true});
};