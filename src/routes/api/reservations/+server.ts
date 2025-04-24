// src/api/reservations/+server.ts
// GET /api/reservations?inquery_date=YYYY-MM-DD

import { json } from '@sveltejs/kit';
import { query } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const inquery_date = url.searchParams.get('inquery_date');

	if (!inquery_date) {
		return new Response('Missing date parameter', { status: 400 });
	}

	try {
		// const result = await query(
		//     `SELECT id, room_id, user_id 
		//     , start_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul' AS start_time
		//     , end_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul' AS end_time
		//     FROM reservation 
		//     WHERE DATE(start_time) = $1 
		//     ORDER BY room_id, start_time`,
		//     [inquery_date]
		// );
		const result = await query(
			`SELECT id, room_id, user_id 
            , start_time 
            , end_time 
            FROM reservation 
            WHERE DATE(start_time) = $1 
            ORDER BY room_id, start_time`,
			[inquery_date]
		);
		return json(result);

	} catch (err) {
		console.error(err);
		return json({ error: 'Internal Server Error.' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { room_id, user_id, name, email, phone, start_time } = body;

		if (!room_id || !user_id || !name || !start_time) {
			return new Response('Missing required fields', { status: 400 });
		}

		const start = new Date(start_time);
		const end = new Date(start);
		end.setHours(start.getHours() + 1);

		// 중복 예약 확인
		const conflictCheck = await query(
			`SELECT 1 FROM reservation WHERE room_id = $1 AND start_time = $2`,
			[room_id, start.toISOString()]
		);

		if (conflictCheck.length > 0) {
			return new Response('Time slot already reserved', { status: 409 });
		}
		// ✅ 하루 최대 2시간 제한
		const dayLimitCheck = await query(
			`SELECT SUM(EXTRACT(EPOCH FROM (end_time - start_time)) / 3600) AS total_hours
			 FROM reservation
			 WHERE user_id = $1 AND DATE(start_time) = $2`,
			[user_id, start.toISOString().split('T')[0]]
		);
		const totalHoursToday = parseFloat(dayLimitCheck[0].total_hours ?? 0);
		if (totalHoursToday + 1 > 2) {
			return new Response('하루 최대 2시간까지만 예약할 수 있습니다.', { status: 403 });
		}

	// 	// ✅ 하루 최대 2건 제한
	// 	const dailyCountCheck = await query(
	// 		`SELECT COUNT(*) FROM reservation 
	//  WHERE user_id = $1 AND DATE(start_time) = $2`,
	// 		[user_id, start.toISOString().split('T')[0]]
	// 	);
	// 	if (parseInt(dailyCountCheck[0].count) >= 2) {
	// 		return new Response('하루 최대 2시간까지만 예약할 수 있습니다.', { status: 403 });
	// 	}

		// ✅ 월 20시간 제한
	
		const monthLimitCheck = await query(
			`SELECT SUM(EXTRACT(EPOCH FROM (end_time - start_time)) / 3600) AS total_hours
			 FROM reservation
			 WHERE user_id = $1
				 AND DATE_TRUNC('month', start_time) = DATE_TRUNC('month', $2::timestamp)`,
			[user_id, start.toISOString()]
		);
		
		const monthlyHours = Number(monthLimitCheck[0].total_hours ?? 0);
		
		if (monthlyHours + 1 > 20) {
			return new Response('한 달 최대 20시간까지만 예약할 수 있습니다.', { status: 403 });
		}

		await query(
			`INSERT INTO reservation 
				(room_id, user_id, name, email, phone, start_time, end_time)
			 VALUES
				($1, $2, $3, $4, $5, $6, $7)`,
			[
				room_id,
				user_id,
				name,
				email ?? null,
				phone ?? null,
				start.toISOString(),
				end.toISOString()
			]
		);

		return new Response('Reservation created', { status: 201 });
	} catch (err) {
		console.error(err);
		return new Response('Internal Server Error', { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { id, user_id } = body;

		if (!id || !user_id) {
			return new Response('Missing required fields', { status: 400 });
		}

		// 본인 예약인지 확인 
		const check = await query(
			`SELECT 1 FROM reservation WHERE id = $1 AND user_id = $2 `, [id, user_id]);
		if (check.length === 0) {
			return new Response('Reservation not found or not authorized', { status: 403 });
		}
		//삭제
		await query(`DELETE FROM reservation WHERE id= $1`, [id]);

		return new Response(null, { status: 204 });
	} catch (err) {
		console.error(err);
		return new Response('Internal Server Error', { status: 500 });
	}
};