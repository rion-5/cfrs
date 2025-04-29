// src/api/reading-seats/+server.ts
import { json } from '@sveltejs/kit';
import { query } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request }) => {
    try {
        // 현재 사용 중인 좌석 조회 (end_time IS NULL)
        const result = await query(
            `SELECT seat_number, user_id
       FROM reading_seats
       WHERE end_time IS NULL`,
            []
        );

        // 사용 중인 좌석 목록
        const usedSeats = result.map((row: any) => parseInt(row.seat_number));

        // 현재 사용자의 좌석 (요청 헤더나 쿠키에서 user_id 가져오기)
        let mySeat: number | null = null;
        const userId = request.headers.get('x-user-id');
        if (userId) {
            const mySeatResult = await query(
                `SELECT seat_number
         FROM reading_seats
         WHERE user_id = $1 AND end_time IS NULL`,
                [userId]
            );
            if (mySeatResult.length > 0) {
                mySeat = parseInt(mySeatResult[0].seat_number);
            }
        }

        return json({ usedSeats, mySeat });
    } catch (err) {
        console.error(err);
        return json({ error: '내부 서버 오류입니다.' }, { status: 500 });
    }
};

export const POST: RequestHandler = async ({ request }) => {
    try {
        const body = await request.json();
        const { seat, user_id, name } = body;

        if (!seat || !user_id || !name) {
            return new Response('필수 필드가 누락되었습니다.', { status: 400 });
        }


        // 이미 사용 중인 좌석인지 확인
        const conflictCheck = await query(
            `SELECT 1 FROM reading_seats WHERE seat_number = $1 AND end_time IS NULL`,
            [seat]
        );
        if (conflictCheck.length > 0) {
            return new Response('이미 사용 중인 좌석입니다.', { status: 409 });
        }

        // 사용자가 이미 다른 좌석을 사용 중인지 확인
        const userSeatCheck = await query(
            `SELECT 1 FROM reading_seats WHERE user_id = $1 AND end_time IS NULL`,
            [user_id]
        );
        if (userSeatCheck.length > 0) {
            return new Response('이미 다른 좌석을 사용 중입니다.', { status: 403 });
        }

        // 하루 10번, 3시간 제한 검증
        const today = new Date().toISOString().split('T')[0];
        const usageCheck = await query(
            `SELECT COUNT(*) AS usage_count, 
              SUM(EXTRACT(EPOCH FROM (COALESCE(end_time, CURRENT_TIMESTAMP) - start_time)) / 3600) AS total_hours
       FROM reading_seats
       WHERE user_id = $1 AND DATE(start_time) = $2`,
            [user_id, today]
        );
        const usageCount = parseInt(usageCheck[0].usage_count, 10);
        const totalHours = parseFloat(usageCheck[0].total_hours || '0');

        if (usageCount >= 10) {
            return new Response('하루에 2번만 이용할 수 있습니다.', { status: 403 });
        }
        if (totalHours >= 6) {
            return new Response('하루에 최대 6시간만 이용할 수 있습니다.', { status: 403 });
        }

        // 좌석 이용 등록
        await query(
            `INSERT INTO reading_seats (seat_number, user_id, user_name, start_time)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
            [seat, user_id, name]
        );

        return new Response('좌석이 예약되었습니다.', { status: 201 });
    } catch (err) {
        console.error(err);
        return new Response('내부 서버 오류입니다.', { status: 500 });
    }
};

export const DELETE: RequestHandler = async ({ request }) => {
    try {
        const body = await request.json();
        const { seat, user_id } = body;

        if (!seat || !user_id) {
            return new Response('좌석 번호 또는 사용자 ID가 누락되었습니다.', { status: 400 });
        }


        // 본인 좌석인지 확인
        const check = await query(
            `SELECT 1 FROM reading_seats WHERE seat_number = $1 AND user_id = $2 AND end_time IS NULL`,
            [seat, user_id]
        );
        if (check.length === 0) {
            return new Response('이용 중인 좌석을 찾을 수 없거나 권한이 없습니다.', { status: 403 });
        }

        // 퇴실 처리: end_time을 현재 시간으로 설정
        await query(
            `UPDATE reading_seats SET end_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE seat_number = $1 AND user_id = $2 AND end_time IS NULL`,
            [seat, user_id]
        );

        return new Response(null, { status: 204 });
    } catch (err) {
        console.error(err);
        return new Response('내부 서버 오류입니다.', { status: 500 });
    }
};