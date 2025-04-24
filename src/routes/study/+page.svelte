<!-- src/routes/study/+page.svelte -->
<script lang="ts">
	import dayjs from 'dayjs';

	import utc from 'dayjs/plugin/utc';
	import timezone from 'dayjs/plugin/timezone';

	import { onMount } from 'svelte';
	import type { Room } from '$lib/types/Room';
	import type { Reservation } from '$lib/types/Reservation';
	import { auth } from '$lib/stores/auth';
	import { get } from 'svelte/store';
	import { goto } from '$app/navigation';

	dayjs.extend(utc);
	dayjs.extend(timezone);
	// 이제 타임존 지정 가능
	const now = dayjs().tz('Asia/Seoul');

	let availableHours: number[] = [];
	let currentHour: number;

	let date = new Date().toISOString().split('T')[0];
	let rooms: Room[] = [];
	let reservations: Reservation[] = [];
	let userId: string | undefined; //2024987654
	let userName: string | undefined;
	const HOURS = Array.from({ length: 14 }, (_, i) => i + 9);

	const dates = Array.from({ length: 4 }, (_, i) => {
		const d = new Date();
		d.setDate(d.getDate() + i);
		return d.toISOString().split('T')[0];
	});

	function goHome() {
		goto('/');
	}

	async function fetchData() {
		const roomRes = await fetch('/api/rooms?type=STUDY');
		rooms = await roomRes.json();

		const resvRes = await fetch(`/api/reservations?inquery_date=${date}`);
		reservations = await resvRes.json();
	}

	// 	function toKSTISOString(date: Date) {
	// 	const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
	// 	return kst.toISOString().slice(0, 19).replace('T', ' ');
	// }

	onMount(() => {
		const $auth = get(auth);
		if (!$auth.isLoggedIn) {
			goto('/login?redirect=/study'); //로그인 후 다시 돌아오게
		} else {
			userId = $auth.id_no;
			userName = $auth.user_name;

			const now = dayjs().tz('Asia/Seoul');
			currentHour = now.hour();

			// 9시부터 22시까지
			availableHours = Array.from({ length: 14 }, (_, i) => i + 9);

			fetchData();
		}
	});

	function isPast(hour: number): boolean {
		return date === now.format('YYYY-MM-DD') && hour <= currentHour;
	}

	function isReserved(roomId: number, hour: number): boolean {
		return reservations.some((r) => {
			if (r.room_id !== roomId) return false;

			const startDateUTC = new Date(r.start_time);
			const startDateKST = new Date(startDateUTC.getTime() + 9 * 60 * 60 * 1000);

			const kstHour = startDateKST.getHours();
			const kstDateStr = startDateKST.toISOString().split('T')[0];

			if (kstDateStr === date && kstHour === hour) {
				// console.log(`[DEBUG] room ${roomId}, 예약 matched at ${kstHour}시 (버튼 hour=${hour})`);
				return true;
			} else {
				// console.log(`[SKIP] room ${roomId}, KST=${kstHour}시, 버튼 hour=${hour}`);
				return false;
			}
		});
	}
	function getMyReservation(roomId: number, hour: number) {
		return reservations.find((r) => {
			const startDateUTC = new Date(r.start_time);
			const startDateKST = new Date(startDateUTC.getTime() + 9 * 60 * 60 * 1000);
			const kstHour = startDateKST.getHours();
			const kstDateStr = startDateKST.toISOString().split('T')[0];

			return (
				r.room_id === roomId && kstDateStr === date && kstHour === hour && r.user_id === userId
			);
		});
	}
	function isMine(roomId: number, hour: number): boolean {
		// return reservations.some((r) => {
		// 	const startDateUTC = new Date(r.start_time);
		// 	const startDateKST = new Date(startDateUTC.getTime() + 9 * 60 * 60 * 1000);
		// 	// const startDateKST = new Date(r.start_time);
		// 	const kstHour = startDateKST.getHours();
		// 	const kstDateStr = startDateKST.toISOString().split('T')[0];

		// 	return (
		// 		r.room_id === roomId &&
		// 		kstDateStr === date &&
		// 		kstHour === hour &&
		// 		r.user_id === userId
		// 	);
		// });

		return !!getMyReservation(roomId, hour);
	}

	//
	async function handleClick(roomId: number, hour: number) {
		const mine = isMine(roomId, hour);
		const reserved = isReserved(roomId, hour);

		if (mine) {
			const myReservation = getMyReservation(roomId, hour);
			const reservationId = myReservation?.id;

			if (reservationId && confirm(`${hour}시 예약을 취소하시겠습니까?`)) {
				// console.log('예약 취소');
				// // ❗ 여기에 취소 API 호출 추가 예정 (아직 구현 전)

				await fetch('/api/reservations', {
					method: 'DELETE',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ id: reservationId, user_id: userId })
				});

				await fetchData(); // UI 갱신
			}
		} else if (!reserved) {
			const nextHour = hour + 1;
			const nextAvailable = !isReserved(roomId, nextHour);
			// const msg = `${hour}시에 예약되었습니다.` + (nextAvailable ? ` ${nextHour}시도 예약하시겠습니까?` : '');

			if (confirm(`${hour}시에 예약하시겠습니까?`)) {
				const start = new Date(`${date}T${String(hour).padStart(2, '0')}:00:00`);
				const end = new Date(start.getTime() + 60 * 60 * 1000);

				// const kst_start = new Date(toKSTISOString(start));
				// const kst_end = new Date(toKSTISOString(end));

				// console.log(`start  ${start}`);
				// console.log(`kst_start  ${toKSTISOString(start)}`);
				// console.log(`end  ${end}`);
				// console.log(`end  ${toKSTISOString(end)}`);
				const res = await fetch(`/api/reservations`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						room_id: roomId,
						user_id: userId,
						start_time: start.toISOString(),
						end_time: end.toISOString(),
						// start_time: start.toISOString(),
						// end_time: end.toISOString(),
						// start_time: toKSTISOString(start), // KST 문자열
						// end_time: toKSTISOString(end),
						name: userName,
						email: '',
						phone: ''
					})
				});
				if (!res.ok) {
					const message = await res.text(); // 서버에서 보낸 에러 메시지
					alert(`예약 실패: ${message}`);
					return;
				}
				// ✅ 예약 후 UI 갱신
				await fetchData();

				// // 2시간 연속 예약
				// if (nextAvailable && confirm(`${nextHour}시도 예약할까요?`)) {
				// 	const nextStart = new Date(start.getTime() + 60 * 60 * 1000);
				// 	const nextEnd = new Date(nextStart.getTime() + 60 * 60 * 1000);

				// 	await fetch(`/api/reservations`, {
				// 		method: 'POST',
				// 		headers: { 'Content-Type': 'application/json' },
				// 		body: JSON.stringify({
				// 			room_id: roomId,
				// 			user_id: userId,
				// 			start_time: nextStart,
				// 			end_time: nextEnd,
				// 			// start_time: nextStart.toISOString(),
				// 			// end_time: nextEnd.toISOString(),
				// 			// start_time: toKSTISOString(nextStart), // KST 문자열
				// 			// end_time: toKSTISOString(nextEnd),
				// 			name: '홍길동',
				// 			email: 'user@example.com',
				// 			phone: '010-1234-5678'
				// 		})
				// 	});

				// 	await fetchData();
				// }
			}
		}
	}
</script>

<div class="p-4">
	<!-- 뒤로가기 버튼 -->
	<button on:click={goHome} class="mb-4 text-sm text-blue-600 hover:underline">
		← 홈으로 돌아가기
	</button>
	<h1>토론실 예약</h1>

	<div class="date-tab">
		{#each dates as d}
			<button
				class:active={d === date}
				on:click={() => {
					date = d;
					reservations = [];
					fetchData();
				}}
			>
				{d}
			</button>
		{/each}
	</div>

	{#each rooms as room}
		<div class="room">
			<h3>{room.name}</h3>
			<div>
				{#each HOURS as hour}
					<div style="display: inline-block; text-align: center;">
						<button
							class="btn
							{isPast(hour)
								? 'past'
								: isMine(room.id, hour)
									? 'mine'
									: isReserved(room.id, hour)
										? 'reserved'
										: 'available'}"
							on:click={() => handleClick(room.id, hour)}
							disabled={isPast(hour)}
						>
							{hour}
						</button>
						<div class="btn-info">
							{#each reservations.filter((r) => r.room_id === room.id) as r}
								<!-- {@const utc = new Date(r.start_time)}
							{@const kst = new Date(utc.getTime() + 9 * 60 * 60 * 1000)}
							{#if utc.getHours() === hour}
								<div>
									{utc.toISOString().slice(11, 16)} → {kst.toISOString().slice(11, 16)}<br />
									({kst.toISOString().split('T')[0]})
								</div>
							{/if} -->
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/each}
</div>

<style>
	.date-tab {
		display: flex;
		gap: 1rem;
		margin-bottom: 1rem;
	}
	.date-tab button {
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		font-weight: bold;
		cursor: pointer;
		border: 2px solid transparent;
	}
	.date-tab button.active {
		border-color: #3b82f6;
		background-color: #dbeafe;
	}

	.room {
		margin-bottom: 2rem;
	}
	.btn {
		margin: 0.2rem;
		padding: 0.6rem;
		width: 2.5rem;
		border-radius: 0.5rem;
		text-align: center;
		font-weight: bold;
		color: white;
		border: none;
	}
	.btn.past {
		background-color: #9ca3af; /* 회색 */
	}

	.btn.available {
		background-color: #3b82f6;
	}
	.btn.mine {
		background-color: #ef4444;
	}
	.btn.reserved {
		background-color: #d1d5db;
	}
	.btn-info {
		font-size: 0.6rem;
		color: #6b7280;
		text-align: center;
		margin-top: 0.2rem;
	}
</style>
