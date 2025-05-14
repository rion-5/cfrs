import { json } from '@sveltejs/kit';
import { query } from '$lib/server/db';
import { getSemesterCode } from '$lib/utils/semester';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
    const classroomId = url.searchParams.get('classroom_id');
    const date = url.searchParams.get('date');

    if (!classroomId || !date) {
        return json({ error: 'classroom_id와 date가 필요합니다.' }, { status: 400 });
    }

    // 학기 코드 조회
    const semesterCode = await getSemesterCode(date);
    if (!semesterCode) {
        // 학기 외 날짜: 빈 스케줄 반환
        console.log(`No schedules for ${date}: Not in any semester`);
        return json([]);
    }

    const sql = `
        SELECT classroom_id, day_of_week, start_time, end_time, semester
        FROM schedules
        WHERE classroom_id = $1
        AND day_of_week = CASE to_char($2::date, 'FMDay')
            WHEN 'Monday' THEN '월요일'
            WHEN 'Tuesday' THEN '화요일'
            WHEN 'Wednesday' THEN '수요일'
            WHEN 'Thursday' THEN '목요일'
            WHEN 'Friday' THEN '금요일'
            WHEN 'Saturday' THEN '토요일'
            WHEN 'Sunday' THEN '일요일'
            ELSE ''
        END
        AND semester = $3;
    `;
    const params = [classroomId, date, semesterCode];
    console.log('Schedules Query:', sql, 'Params:', params);

    try {
        const result = await query(sql, params);
        const schedules = result.map((row) => ({
            classroom_id: row.classroom_id,
            day_of_week: row.day_of_week,
            start_time: row.start_time,
            end_time: row.end_time,
            semester: row.semester
        }));
        console.log('Schedules Result:', schedules);
        return json(schedules);
    } catch (error) {
        console.error('Schedules Query Error:', error);
        return json({ error: '수업 데이터를 가져오지 못했습니다.' }, { status: 500 });
    }
};