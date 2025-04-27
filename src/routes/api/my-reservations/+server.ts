// src/api/my-reservations/+server.ts
import { json } from '@sveltejs/kit';
import { query } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  const user_id = url.searchParams.get('user_id');
  if (!user_id) {
    return new Response('사용자 ID가 누락되었습니다.', { status: 400 });
  }

  try {
    const result = await query(
      `SELECT r.id, r.room_id,
        (SELECT name FROM room WHERE id = r.room_id) AS room_name,
        r.start_time, r.end_time, r.actual_end_time
       FROM reservation r
       WHERE r.user_id = $1
         AND DATE(r.start_time) >= CURRENT_DATE
       ORDER BY r.start_time ASC`,
      [user_id]
    );
    return json(result);
  } catch (err) {
    console.error(err);
    return json({ error: '내부 서버 오류입니다.' }, { status: 500 });
  }
};