// src/api/reservations/+server.ts
import { json, error } from '@sveltejs/kit';
import { query } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
  // 세션 검증
  if (!locals.session.user) {
    throw error(401, '인증되지 않은 사용자입니다.');
  }

  const inquery_date = url.searchParams.get('inquery_date');
  if (!inquery_date) {
    throw error(400, '날짜 파라미터가 누락되었습니다.');
  }

  try {
    const result = await query(
      `SELECT id, room_id, user_id, start_time, end_time
       FROM reservation
       WHERE DATE(start_time) = $1 AND user_id = $2
       ORDER BY room_id, start_time`,
      [inquery_date, locals.session.user.id_no]
    );
    return json(result);
  } catch (err) {
    console.error(err);
    throw error(500, '내부 서버 오류입니다.');
  }
};

export const POST: RequestHandler = async ({ request, locals }) => {
  // 세션 검증
  if (!locals.session.user) {
    throw error(401, '인증되지 않은 사용자입니다.');
  }

  try {
    const body = await request.json();
    const { room_id, user_id, name, email, phone, start_time, end_time } = body;

    // user_id 검증
    if (user_id !== locals.session.user.id_no) {
      throw error(403, '잘못된 사용자 ID입니다.');
    }

    if (!room_id || !user_id || !name || !start_time || !end_time) {
      throw error(400, '필수 필드가 누락되었습니다.');
    }

    // start_time, end_time 형식 검증
    const timeRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
    if (!timeRegex.test(start_time) || !timeRegex.test(end_time)) {
      throw error(400, '잘못된 시간 형식입니다. YYYY-MM-DD HH:mm:ss 형식이어야 합니다.');
    }

    // 중복 예약 확인
    const conflictCheck = await query(
      `SELECT 1 FROM reservation WHERE room_id = $1 AND start_time = $2`,
      [room_id, start_time]
    );
    if (conflictCheck.length > 0) {
      throw error(409, '이미 예약된 시간대입니다.');
    }

    // 하루 최대 2시간 제한
    const dayLimitCheck = await query(
      `SELECT SUM(EXTRACT(EPOCH FROM (end_time - start_time)) / 3600) AS total_hours
       FROM reservation
       WHERE user_id = $1 AND DATE(start_time) = $2`,
      [locals.session.user.id_no, start_time.split(' ')[0]]
    );
    const totalHoursToday = parseFloat(dayLimitCheck[0].total_hours ?? 0);
    if (totalHoursToday + 1 > 2) {
      throw error(403, '하루 최대 2시간까지만 예약할 수 있습니다.');
    }

    // 월 20시간 제한
    const monthLimitCheck = await query(
      `SELECT SUM(EXTRACT(EPOCH FROM (end_time - start_time)) / 3600) AS total_hours
       FROM reservation
       WHERE user_id = $1
       AND DATE_TRUNC('month', start_time) = DATE_TRUNC('month', TO_DATE($2, 'YYYY-MM-DD'))`,
      [locals.session.user.id_no, start_time.split(' ')[0]]
    );
    const monthlyHours = Number(monthLimitCheck[0].total_hours ?? 0);
    if (monthlyHours + 1 > 20) {
      throw error(403, '한 달 최대 20시간까지만 예약할 수 있습니다.');
    }

    await query(
      `INSERT INTO reservation 
       (room_id, user_id, name, email, phone, start_time, end_time)
       VALUES
       ($1, $2, $3, $4, $5, $6, $7)`,
      [room_id, locals.session.user.id_no, name, email ?? null, phone ?? null, start_time, end_time]
    );

    // return new Response('예약이 완료되었습니다.', { status: 201 });
    return json({ message: '예약이 완료되었습니다.' }, { status: 201 });
  } catch (err) {
    throw err;
  }
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
  // 세션 검증
  if (!locals.session.user) {
    throw error(401, '인증되지 않은 사용자입니다.');
  }

  try {
    const body = await request.json();
    const { id, user_id } = body;

    // user_id 검증
    if (user_id !== locals.session.user.id_no) {
      throw error(403, '잘못된 사용자 ID입니다.');
    }

    if (!id || !user_id) {
      throw error(400, '필수 필드가 누락되었습니다.');
    }

    // 본인 예약인지 확인
    const check = await query(
      `SELECT 1 FROM reservation WHERE id = $1 AND user_id = $2`,
      [id, locals.session.user.id_no]
    );
    if (check.length === 0) {
      throw error(403, '예약을 찾을 수 없거나 권한이 없습니다.');
    }

    // 삭제
    await query(`DELETE FROM reservation WHERE id = $1`, [id]);

    return new Response(null, { status: 204 });
  } catch (err) {
    console.error(err);
    throw error(500, '내부 서버 오류입니다.');
  }
};