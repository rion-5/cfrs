// src/api/reading-seats/+server.ts
import { json, error } from '@sveltejs/kit';
import { query } from '$lib/server/db';
import type { RequestHandler } from './$types';
import { getTodayKST } from '$lib/utils/date';
import { requireAuth } from '$lib/server/auth';

export const GET: RequestHandler = async (event) => {
    const user = await requireAuth(event); // 인증 확인 

    try {
        const userId = user.id_no;
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
        // const userId = request.headers.get('x-user-id');

        const mySeatResult = await query(
            `SELECT seat_number
         FROM reading_seats
         WHERE user_id = $1 AND end_time IS NULL`,
            [userId]
        );
        if (mySeatResult.length > 0) {
            mySeat = parseInt(mySeatResult[0].seat_number);
        }


        return json({ usedSeats, mySeat });
    } catch (err) {
        // console.error(err);
        // // return json({ error: '내부 서버 오류입니다.' }, { status: 500 });
        // throw error(500, '내부 서버 오류입니다.');
        throw err;
    }
};

export const POST: RequestHandler = async (event) => {
    const user = await requireAuth(event); // 인증 확인 

    try {
        const userId = user.id_no;
        const body = await event.request.json();
        const { seat, name } = body;

        if (!seat  || !name) {
            // return new Response('필수 필드가 누락되었습니다.', { status: 400 });
            throw error(400, '좌석 번호 또는 이름이 누락되었습니다.');
        }

        // 이미 사용 중인 좌석인지 확인
        const conflictCheck = await query(
            `SELECT 1 FROM reading_seats WHERE seat_number = $1 AND end_time IS NULL`,
            [seat]
        );
        if (conflictCheck.length > 0) {
            // return new Response('이미 사용 중인 좌석입니다.', { status: 409 });
            throw error(409, '이미 사용 중인 좌석입니다.');
        }

        // 사용자가 이미 다른 좌석을 사용 중인지 확인
        const userSeatCheck = await query(
            `SELECT 1 FROM reading_seats WHERE user_id = $1 AND end_time IS NULL`,
            [userId]
        );
        if (userSeatCheck.length > 0) {
            // return new Response('이미 다른 좌석을 사용 중입니다.', { status: 403 });
            throw error(403, '이미 다른 좌석을 사용 중입니다.');
        }

        // 하루 10번, 3시간 제한 검증
 
        // const utctoday = new Date().toISOString().split('T')[0];

        const today = getTodayKST();
        const usageCheck = await query(
            `SELECT COUNT(*) AS usage_count, 
              SUM(EXTRACT(EPOCH FROM (COALESCE(end_time, CURRENT_TIMESTAMP) - start_time)) / 3600) AS total_hours
       FROM reading_seats
       WHERE user_id = $1 AND DATE(start_time) = $2`,
            [userId, today]
        );
        const usageCount = parseInt(usageCheck[0].usage_count, 10);
        const totalHours = parseFloat(usageCheck[0].total_hours || '0');

        if (usageCount >= 10) {
            // return new Response('하루에 2번만 이용할 수 있습니다.', { status: 403 });
            throw error(403, '하루에 2번만 이용할 수 있습니다.');
        }
        if (totalHours >= 6) {
            // return new Response('하루에 최대 6시간만 이용할 수 있습니다.', { status: 403 });
            throw error(403, '하루에 최대 6시간만 이용할 수 있습니다.');
        }

        // 좌석 이용 등록
        await query(
            `INSERT INTO reading_seats (seat_number, user_id, user_name, start_time)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
            [seat, userId, name]
        );

        // return new Response('좌석이 예약되었습니다.', { status: 201 });
        return json({ message: '좌석이 예약되었습니다.' }, { status: 201 });
    } catch (err) {
        // console.error(err);
        // throw error(500, '내부 서버 오류입니다.');
        throw err;
        // console.error('POST /api/reading-seats:', err);
        // throw error(500, '좌석 예약에 실패했습니다.');
    }
};

export const DELETE: RequestHandler = async (event) => {
    const user = await requireAuth(event); // 인증 확인 
    try {
        const userId = user.id_no;
        const body = await event.request.json();
        const { seat } = body;

        if (!seat ) {
            // return new Response('좌석 번호 또는 사용자 ID가 누락되었습니다.', { status: 400 });
            throw error(400, '좌석 번호 가 누락되었습니다.');
        }

        // 본인 좌석인지 확인
        const check = await query(
            `SELECT 1 FROM reading_seats WHERE seat_number = $1 AND user_id = $2 AND end_time IS NULL`,
            [seat, userId]
        );
        if (check.length === 0) {
            // return new Response('이용 중인 좌석을 찾을 수 없거나 권한이 없습니다.', { status: 403 });
            throw error(403, '이용 중인 좌석을 찾을 수 없거나 권한이 없습니다.');
        }

        // 퇴실 처리: end_time을 현재 시간으로 설정
        await query(
            `UPDATE reading_seats SET end_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE seat_number = $1 AND user_id = $2 AND end_time IS NULL`,
            [seat, userId]
        );

        // return new Response(null, { status: 204 });
        return json({ message: '좌석이 퇴실되었습니다.' }, { status: 200 });
    } catch (err) {
        // console.error(err);
        // throw error(500, '내부 서버 오류입니다.');
        throw err;
    //     console.error('DELETE /api/reading-seats:', err);
    // throw error(500, '좌석 퇴실에 실패했습니다.');
    }
};