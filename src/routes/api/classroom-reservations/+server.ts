import { json } from '@sveltejs/kit';
import { query } from '$lib/server/db';
import {toKSTDateString} from '$lib/utils/date';

export async function POST({ request }) {
	const data = await request.json();
	const {
		classroom_id,
		user_id,
		purpose,
		attendees,
		email,
		tel,
		start_time,
		end_time,
		reservation_date
	} = data;

	if (!classroom_id || !user_id || !purpose || !attendees || !start_time || !end_time || !reservation_date) {
		return json({ error: '필수 입력값이 누락되었습니다.' }, { status: 400 });
	}

	// 수용 인원 검증
	const capacityQuery = `SELECT capacity FROM classrooms WHERE classroom_id = $1`;
	const capacityResult = await query(capacityQuery, [classroom_id]);
	if (capacityResult.length === 0) {
		return json({ error: '유효하지 않은 강의실 ID입니다.' }, { status: 400 });
	}
	if (capacityResult[0].capacity < attendees) {
		return json({ error: '이용 인원이 강의실 수용 인원을 초과합니다.' }, { status: 400 });
	}

	// 중복 예약 검증
	const conflictQuery = `
		SELECT 1 FROM classroom_reservations cr
		WHERE cr.classroom_id = $1
		AND cr.reservation_date = $2
		AND cr.start_time < $4
		AND cr.end_time > $3
		AND cr.status = 'approved'
		UNION
		SELECT 1 FROM schedules s
		WHERE s.classroom_id = $1
		AND s.day_of_week = to_char($2::date, 'FMDay')
		AND s.start_time < $4
		AND s.end_time > $3
		AND s.semester = '2025-1'`;
	const conflictResult = await query(conflictQuery, [classroom_id, reservation_date, start_time, end_time]);
	if (conflictResult.length > 0) {
		return json({ error: '선택한 시간대에 이미 예약 또는 수업이 있습니다.' }, { status: 400 });
	}

	// 예약 삽입
	const insertQuery = `
		INSERT INTO classroom_reservations (
			classroom_id, user_id, purpose, email, tel, attendees,
			day_of_week, start_time, end_time, reservation_date, status
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
		RETURNING *`;
	const params = [
		classroom_id,
		user_id,
		purpose,
		email || null,
		tel || null,
		attendees,
		new Date(reservation_date).toLocaleString('ko-KR', { weekday: 'long' }),
		start_time,
		end_time,
		reservation_date
	];
	const result = await query(insertQuery, params);
  
	if (result.length === 0) {
		return json({ error: '예약 신청에 실패했습니다.' }, { status: 500 });
	}
	result[0].reservation_date =toKSTDateString(result[0].reservation_date);
	return json(result[0]);
}