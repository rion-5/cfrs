// src/routes/api/room/+server.ts
// GET /api/rooms?type=STUDY|READING|LECTURE

import { json, error } from '@sveltejs/kit';
import { query } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
    // 세션 검증
    if (!locals.session.user) {
        throw error(401, '인증되지 않은 사용자입니다.');
    }

    const type = url.searchParams.get('type');

    if (!type) {
        throw error(400, 'Missing data parameter');
        // return json({ error: 'Missing data parameter' }, { status: 400 });
    }

    try {
        const result = await query(
            `SELECT id, name, type, capacity from room where type = $1 order by name`,
            [type]
        );
        return json(result);
    } catch (err) {
        console.error(err);
        throw error(500, 'Internal Server Error.');
        // return json({ error: 'Internal Server Error.' }, { status: 500 });
    }
};


