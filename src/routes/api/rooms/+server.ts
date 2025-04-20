// src/routes/api/room/+server.ts
// GET /api/rooms?type=STUDY|READING|LECTURE

import { json } from '@sveltejs/kit';
import { query } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
    const type = url.searchParams.get('type');

    if (!type) {
        return json({ error:'Missing data parameter'}, { status: 400 });
    }

    try {
        const result = await query(
            `SELECT id, name, type from room where type = $1 `, 
            [type]
        );
        return json(result);
    } catch (err) {
        console.error(err);
        return json({error: 'Internal Server Error.'}, { status: 500 });
    }
};


