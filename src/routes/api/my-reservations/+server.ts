// GET /api/my-reservations?user_id=123456

import { json } from '@sveltejs/kit';
import { query } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
    const user_id = url.searchParams.get('user_id');
    try {
        const result = await query(
			`SELECT r.id, r.room_id,
              (SELECT name from room where id=r.room_id ) as room_name,
            r.start_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul' AS start_time,
			        r.end_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul' AS end_time,
			        r.actual_end_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul' AS actual_end_time
			 FROM reservation r
			 WHERE r.user_id = $1
			   AND DATE(r.start_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul') >= CURRENT_DATE
			 ORDER BY r.start_time ASC`,
            [user_id]
        );
        return json(result);
    } catch (err) {
        console.error(err);
        return json({ error: 'Internal Server Error' }, { status: 500 });
    }
};