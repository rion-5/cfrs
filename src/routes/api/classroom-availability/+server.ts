import { json } from '@sveltejs/kit';
import { query } from '$lib/server/db';
import type { ClassroomSlot, ClassroomAvailability } from '$lib/types';

export async function GET({ url }) {
	const date = url.searchParams.get('date'); // 예: 2025-05-05
	const start = url.searchParams.get('start'); // 예: 08:00
	const end = url.searchParams.get('end'); // 예: 22:00

	if (!date || !start || !end) {
		return json({ error: '날짜와 시간대를 입력하세요.' }, { status: 400 });
	}

	// 입력 날짜가 속한 학기 조회
	const semesterQuery = `
		SELECT semester_code
		FROM semester
		WHERE $1::date BETWEEN start_date AND end_date
	`;
	const semesterResult = await query(semesterQuery, [date]);
	if (semesterResult.length === 0) {
		return json({ error: '해당 날짜는 학기 기간에 속하지 않습니다.' }, { status: 400 });
	}
	const semesterCode = semesterResult[0].semester_code;

	// 요일 계산 (한국어 요일: 월요일, 화요일, ...)
	const dayOfWeek = new Date(date).toLocaleString('ko-KR', { weekday: 'long' });

	const sql = `
		SELECT c.classroom_id, c.room_number, c.capacity
		FROM classrooms c
		WHERE NOT EXISTS (
			SELECT 1 FROM schedules s
			WHERE s.classroom_id = c.classroom_id
			AND s.day_of_week = $1
			AND s.start_time < $3
			AND s.end_time > $2
			AND s.semester = $5
		) AND NOT EXISTS (
			SELECT 1 FROM classroom_reservations cr
			WHERE cr.classroom_id = c.classroom_id
			AND cr.reservation_date = $4
			AND cr.start_time < $3
			AND cr.end_time > $2
			AND cr.status = 'approved'
		)`;
	const params = [dayOfWeek, start, end, date, semesterCode];
	const classrooms = await query(sql, params);

	// 타임테이블 슬롯 생성 (30분 단위)
	const slots: ClassroomSlot[] = [];
	const startHour = parseInt(start.split(':')[0]);
	const endHour = parseInt(end.split(':')[0]);
	for (let h = startHour; h < endHour; h++) {
		slots.push({ start: `${h.toString().padStart(2, '0')}:00`, end: `${h.toString().padStart(2, '0')}:30`, available: true });
		slots.push({ start: `${h.toString().padStart(2, '0')}:30`, end: `${(h + 1).toString().padStart(2, '0')}:00`, available: true });
	}

	const availability: ClassroomAvailability[] = classrooms.map((row) => ({
		...row,
		slots
	}));

	return json(availability);
}