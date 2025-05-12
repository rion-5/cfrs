// src/routes/api/classroom-reservations/+server.ts
import { json } from '@sveltejs/kit';
import { query } from '$lib/server/db';
import { toKSTDateString } from '$lib/utils/date';
import type { ClassroomReservation } from '$lib/types';

export async function GET({ url }) {
	const date = url.searchParams.get('date');
	const classroomId = url.searchParams.get('classroom_id');
	const startTime = url.searchParams.get('start');
	const endTime = url.searchParams.get('end');

	if (!date || !startTime || !endTime) {
		return json({ error: '날짜와 시간대를 입력하세요.' }, { status: 400 });
	}

	const sql = `
		SELECT
			reservation_id,
			classroom_id,
			user_id,
			start_time,
			end_time,
			reservation_date,
			purpose,
			attendees,
			email,
			tel,
			day_of_week,
			status
		FROM classroom_reservations
		WHERE reservation_date = $1
			AND (classroom_id = $2 OR $2 IS NULL)
			AND start_time >= $3
			AND end_time <= $4
			AND status IN ('approved', 'pending', 'rejected')
		ORDER BY classroom_id, start_time;
	`;
	const params = [date, classroomId || null, startTime, endTime];
	const result = await query(sql, params);

	const reservations: ClassroomReservation[] = result.map((row) => ({
		reservation_id: row.reservation_id,
		classroom_id: row.classroom_id,
		user_id: row.user_id,
		start_time: row.start_time,
		end_time: row.end_time,
		reservation_date: toKSTDateString(row.reservation_date),
		purpose: row.purpose,
		attendees: row.attendees,
		email: row.email || null,
		tel: row.tel || null,
		day_of_week: row.day_of_week,
		status: row.status,
		created_at: row.created_at || new Date().toISOString()
	}));

	return json(reservations);
}

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

	const capacityQuery = `SELECT capacity FROM classrooms WHERE classroom_id = $1`;
	const capacityResult = await query(capacityQuery, [classroom_id]);
	if (capacityResult.length === 0) {
		return json({ error: '유효하지 않은 강의실 ID입니다.' }, { status: 400 });
	}
	if (capacityResult[0].capacity < attendees) {
		return json({ error: '이용 인원이 강의실 수용 인원을 초과합니다.' }, { status: 400 });
	}

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
	console.log('Insert Query:', insertQuery, 'Params:', params);
	const result = await query(insertQuery, params);

	if (result.length === 0) {
		return json({ error: '예약 신청에 실패했습니다.' }, { status: 500 });
	}

	// 예약 생성 로그
	await query(
		`INSERT INTO reservation_logs (reservation_id, classroom_id, user_id, action)
		 VALUES ($1, $2, $3, 'created')`,
		[result[0].reservation_id, classroom_id, user_id]
	);

	result[0].reservation_date = toKSTDateString(result[0].reservation_date);
	return json(result[0]);
}

export async function DELETE({ url, locals }) {
	const reservationId = url.searchParams.get('reservation_id');
	const userId = locals.session?.user?.id_no;
	console.log('DELETE:', { reservationId, userId, session: locals.session });

	if (!reservationId || !userId) {
		return json({ error: '예약 ID와 사용자 ID가 필요합니다.' }, { status: 400 });
	}

	// 취소 전 레코드 조회 (로그용)
	const selectQuery = `
		SELECT classroom_id, user_id
		FROM classroom_reservations
		WHERE reservation_id = $1 AND user_id = $2 AND status IN ('pending', 'approved');
	`;
	const selectResult = await query(selectQuery, [reservationId, userId]);
	if (selectResult.length === 0) {
		return json({ error: '예약을 찾을 수 없거나 취소 권한이 없습니다.' }, { status: 400 });
	}

	// 취소 로그 삽입
	await query(
		`INSERT INTO reservation_logs (reservation_id, classroom_id, user_id, action)
		 VALUES ($1, $2, $3, 'cancelled')`,
		[reservationId, selectResult[0].classroom_id, userId]
	);

	// 레코드 삭제
	const deleteQuery = `
		DELETE FROM classroom_reservations
		WHERE reservation_id = $1
		AND user_id = $2
		AND status IN ('pending', 'approved')
		RETURNING reservation_id;
	`;
	const result = await query(deleteQuery, [reservationId, userId]);
	console.log('DELETE Result:', result);

	if (result.length === 0) {
		return json({ error: '예약을 찾을 수 없거나 취소 권한이 없습니다.' }, { status: 400 });
	}

	return json({ success: true, reservation_id: result[0].reservation_id });
}