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
			cr.reservation_id,
			cr.classroom_id, c.room_number,
			cr.user_id,
			cr.start_time,
			cr.end_time,
			cr.reservation_date,
			cr.purpose,
			cr.attendees,
			cr.email,
			cr.tel,
			cr.day_of_week,
			cr.status
		FROM classroom_reservations cr
		    LEFT JOIN classrooms c ON cr.classroom_id = c.classroom_id
		WHERE cr.reservation_date = $1
			AND (cr.classroom_id = $2 OR $2 IS NULL)
			AND cr.start_time >= $3
			AND cr.end_time <= $4
			AND cr.status IN ('approved', 'pending', 'rejected')
		ORDER BY cr.classroom_id, cr.start_time;
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

export async function POST({ request, locals }) {
	if (!locals.session?.user?.id_no) {
		return json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 });
	}

	const data = await request.json();
	const {
		classroom_id, room_number,
		user_id,
		purpose,
		attendees,
		email,
		tel,
		start_time,
		end_time,
		reservation_date,
		day_of_week
	} = data;

	// 필수 필드 검증
	if (!classroom_id || !user_id || !purpose || !attendees || !start_time || !end_time || !reservation_date || !day_of_week) {
		return json({ error: '필수 입력값이 누락되었습니다: classroom_id, user_id, purpose, attendees, start_time, end_time, reservation_date, day_of_week' }, { status: 400 });
	}

	// 사용자 인증 검증
	if (user_id !== locals.session.user.id_no) {
		return json({ error: '사용자 ID가 일치하지 않습니다.' }, { status: 403 });
	}

	// 강의실 수용 인원 검증
	const capacityQuery = `SELECT capacity FROM classrooms WHERE classroom_id = $1`;
	const capacityResult = await query(capacityQuery, [classroom_id]);
	if (capacityResult.length === 0) {
		return json({ error: '유효하지 않은 강의실 ID입니다.' }, { status: 400 });
	}
	if (capacityResult[0].capacity < attendees) {
		return json({ error: '이용 인원이 강의실 수용 인원을 초과합니다.' }, { status: 400 });
	}

	// 예약 충돌 검증
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
		AND s.day_of_week = CASE to_char($2::date, 'FMDay')
			WHEN 'Monday' THEN '월요일'
			WHEN 'Tuesday' THEN '화요일'
			WHEN 'Wednesday' THEN '수요일'
			WHEN 'Thursday' THEN '목요일'
			WHEN 'Friday' THEN '금요일'
			WHEN 'Saturday' THEN '토요일'
			WHEN 'Sunday' THEN '일요일'
			ELSE ''
		END
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
		day_of_week,
		start_time,
		end_time,
		reservation_date
	];
	//console.log('Insert Query:', insertQuery, 'Params:', params);
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
	//console.log('DELETE:', { reservationId, userId, session: locals.session });

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
	//console.log('DELETE Result:', result);

	if (result.length === 0) {
		return json({ error: '예약을 찾을 수 없거나 취소 권한이 없습니다.' }, { status: 400 });
	}

	return json({ success: true, reservation_id: result[0].reservation_id });
}