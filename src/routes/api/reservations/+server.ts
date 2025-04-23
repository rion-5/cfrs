// src/api/reservations/+server.ts
// GET /api/reservations?inquery_date=YYYY-MM-DD

import { json } from '@sveltejs/kit';
import { query } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
    const inquery_date = url.searchParams.get('inquery_date');

    if (!inquery_date) {
        return new Response('Missing date parameter', { status: 400 });
    }

    try {
        // const result = await query(
        //     `SELECT id, room_id, user_id 
        //     , start_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul' AS start_time
        //     , end_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul' AS end_time
        //     FROM reservation 
        //     WHERE DATE(start_time) = $1 
        //     ORDER BY room_id, start_time`,
        //     [inquery_date]
        // );
        const result = await query(
            `SELECT id, room_id, user_id 
            , start_time 
            , end_time 
            FROM reservation 
            WHERE DATE(start_time) = $1 
            ORDER BY room_id, start_time`,
            [inquery_date]
        );
        return json(result);

    } catch (err) {
        console.error(err);
        return json({error: 'Internal Server Error.'}, { status: 500 });
    }
};
