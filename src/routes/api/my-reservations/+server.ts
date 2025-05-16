// src/api/my-reservations/+server.ts
import { json, error } from '@sveltejs/kit';
import { query } from '$lib/server/db';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth';

export const GET: RequestHandler = async (event) => {
    const user = await requireAuth(event); // 인증 확인
    try {
        const userId = user.id_no;
        // 토론실 예약 조회
        const reservations = await query(
            `SELECT r.id, r.room_id,
                (SELECT name FROM room WHERE id = r.room_id) AS room_name,
                r.start_time, r.end_time, r.actual_end_time
             FROM reservation r
             WHERE r.user_id = $1
               AND DATE(r.start_time) >= CURRENT_DATE
             ORDER BY r.start_time ASC`,
            [userId]
        );

        // 열람실 이용 현황 조회
        const seatUsages = await query(
            `SELECT id, seat_number, user_id, start_time, end_time
             FROM reading_seats
             WHERE user_id = $1
               AND DATE(start_time) >= CURRENT_DATE
               AND end_time is NULL`,
            [userId]
        );

        // 강의실 예약 조회
        const classroomReservations = await query(
            `SELECT cr.reservation_id, cr.classroom_id, c.room_number,
                    cr.user_id, cr.purpose, cr.attendees, 
                    cr.start_time, cr.end_time,
                    TO_CHAR(cr.reservation_date, 'YYYY-MM-DD') AS reservation_date,
                    cr.day_of_week, cr.status, cr.created_at
             FROM classroom_reservations cr
             LEFT JOIN classrooms c ON cr.classroom_id = c.classroom_id
             WHERE cr.user_id = $1
               AND DATE(cr.reservation_date) >= CURRENT_DATE
               AND cr.status IN ('pending', 'approved', 'rejected')
             ORDER BY cr.reservation_date, cr.start_time ASC`,
            [userId]
        );

        //console.log('Reservations:', reservations, 'SeatUsages:', seatUsages, 'ClassroomReservations:', classroomReservations);

        return json({ reservations, seatUsages, classroomReservations });
    } catch (err) {
        console.error(err);
        throw error(500, '내부 서버 오류입니다.');
    }
};