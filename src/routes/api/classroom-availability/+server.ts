// src/routes/api/classroom-availability/+Server.ts

import { json } from '@sveltejs/kit';
import { query } from '$lib/server/db';
import type { ClassroomSlot, ClassroomAvailability } from '$lib/types';

export async function GET({ url }) {
    const date = url.searchParams.get('date');
    const classroomId = url.searchParams.get('classroom_id');
    const start = url.searchParams.get('start');
    const end = url.searchParams.get('end');

    if (!date || !start || !end) {
        return json({ error: '날짜와 시간대를 입력하세요.' }, { status: 400 });
    }

    const sql = `
        WITH input AS (
            SELECT
                $1::date AS query_date,
                $2::varchar AS classroom_id,
                $3::time AS start_time,
                $4::time AS end_time
        ),
        semester_check AS (
            SELECT semester_code
            FROM semester
            WHERE (SELECT query_date FROM input) BETWEEN start_date AND end_date
        ),
        day_mapping AS (
            SELECT
                CASE to_char(query_date, 'ID')
                    WHEN '1' THEN '월요일'
                    WHEN '2' THEN '화요일'
                    WHEN '3' THEN '수요일'
                    WHEN '4' THEN '목요일'
                    WHEN '5' THEN '금요일'
                    WHEN '6' THEN '토요일'
                    WHEN '7' THEN '일요일'
                END AS dow
            FROM input
        ),
        time_slots AS (
            SELECT
                generate_series(
                    (SELECT query_date + start_time FROM input),
                    (SELECT query_date + end_time FROM input) - INTERVAL '30 minutes',
                    INTERVAL '30 minutes'
                ) AS slot_start_ts
        ),
        time_slots_with_end AS (
            SELECT
                slot_start_ts,
                slot_start_ts + INTERVAL '30 minutes' AS slot_end_ts
            FROM time_slots
        ),
        classrooms AS (
            SELECT classroom_id, room_number, capacity
            FROM classrooms
            WHERE (classroom_id = (SELECT classroom_id FROM input) OR (SELECT classroom_id FROM input) IS NULL)
        )
        SELECT
            c.classroom_id,
            c.room_number,
            c.capacity,
            (SELECT dow FROM day_mapping) AS day_of_week,
            to_char(ts.slot_start_ts::time, 'HH24:MI') AS start_time,
            to_char(ts.slot_end_ts::time, 'HH24:MI') AS end_time,
            CASE
                WHEN (SELECT semester_code FROM semester_check LIMIT 1) IS NULL THEN true
                ELSE NOT EXISTS (
                    SELECT 1
                    FROM schedules s
                    WHERE s.semester = (SELECT semester_code FROM semester_check)
                    AND s.day_of_week = (SELECT dow FROM day_mapping)
                    AND s.start_time < ts.slot_end_ts::time
                    AND s.end_time > ts.slot_start_ts::time
                    AND s.classroom_id = c.classroom_id
                )
            END AS available
        FROM classrooms c
        CROSS JOIN time_slots_with_end ts
        ORDER BY c.classroom_id, ts.slot_start_ts;
    `;
    const params = [date, classroomId || null, start, end];
    const result = await query(sql, params);

    const availability: ClassroomAvailability[] = [];
    const classrooms = [...new Set(result.map((row) => row.classroom_id))];
    for (const cid of classrooms) {
        const rows = result.filter((row) => row.classroom_id === cid);
        const classroom = rows[0];
        availability.push({
            classroom_id: classroom.classroom_id,
            room_number: classroom.room_number,
            capacity: classroom.capacity,
            slots: rows.map((row) => ({
                start: row.start_time,
                end: row.end_time,
                available: row.available
            }))
        });
    }

    return json(availability);
}