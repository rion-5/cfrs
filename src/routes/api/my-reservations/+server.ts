// src/api/my-reservations/+server.ts
import { json, error } from '@sveltejs/kit';
import { query } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
  // 세션 검증
  if (!locals.session.user) {
    throw error(401, '인증되지 않은 사용자입니다.');
  }

  try {
    // 토론실 예약 조회
    const reservations = await query(
      `SELECT r.id, r.room_id,
        (SELECT name FROM room WHERE id = r.room_id) AS room_name,
        r.start_time, r.end_time, r.actual_end_time
       FROM reservation r
       WHERE r.user_id = $1
         AND DATE(r.start_time) >= CURRENT_DATE
       ORDER BY r.start_time ASC`,
      [locals.session.user.id_no]
    );

    // 열람실 이용 현황 조회
    const seatUsages = await query(
      `SELECT id, seat_number, user_id, start_time, end_time
       FROM reading_seats
       WHERE user_id = $1
         AND DATE(start_time) >= CURRENT_DATE
       ORDER BY start_time ASC`,
      [locals.session.user.id_no]
    );

    return json({ reservations, seatUsages });
  } catch (err) {
    console.error(err);
    // return json({ error: '내부 서버 오류입니다.' }, { status: 500 });
    throw error(500, '내부 서버 오류입니다.');

  }
};