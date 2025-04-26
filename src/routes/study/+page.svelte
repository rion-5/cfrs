<!-- src/routes/study/+page.svelte -->
<script lang="ts">
	import dayjs from 'dayjs';

	import utc from 'dayjs/plugin/utc';
	import timezone from 'dayjs/plugin/timezone';

	import { onMount } from 'svelte';
	import type { Room } from '$lib/types/Room';
	import type { Reservation } from '$lib/types/Reservation';
	import { auth, logout } from '$lib/stores/auth';
	import { get } from 'svelte/store';
	import { goto } from '$app/navigation';
	import { format } from 'date-fns';
	import { ko } from 'date-fns/locale';

	// 날짜 포맷 함수
	function formatDateKorean(dateString: string) {
		const dateObj = new Date(dateString);
		const month = dateObj.getMonth() + 1;
		const day = dateObj.getDate();
		const weekday = format(dateObj, 'eee', { locale: ko }); // 예: 금
		return `${month}.${day}.${weekday}`;
	}
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
			// goto('/login?redirect=/study'); //로그인 후 다시 돌아오게

			userId = 'A011982';
			userName = '이상근';
			const now = dayjs().tz('Asia/Seoul');
			currentHour = now.hour();
			availableHours = Array.from({ length: 14 }, (_, i) => i + 9);
			fetchData();
		} else {
			userId = $auth.id_no;
			userName = $auth.user_name;
			const now = dayjs().tz('Asia/Seoul');
			currentHour = now.hour();
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
		return !!getMyReservation(roomId, hour);
	}

	async function handleClick(roomId: number, hour: number) {
		const mine = isMine(roomId, hour);
		const reserved = isReserved(roomId, hour);

		if (mine) {
			const myReservation = getMyReservation(roomId, hour);
			const reservationId = myReservation?.id;

			if (reservationId && confirm(`${hour}시 예약을 취소하시겠습니까?`)) {

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
			}
		}
	}

	function handleLogout() {
		logout();
		goto('/login');
	}
</script>

<main class="mx-auto max-w-screen-md space-y-8 px-4 py-6 text-center text-neutral-800 sm:px-6 lg:px-8">
	<!-- 상단 네비게이션 -->
	<div class="flex items-center justify-between px-2 sm:px-4">
		<button on:click={goHome} class="text-sm text-blue-600 hover:underline">← Home</button>
		<button class="text-sm text-red-500 hover:underline" on:click={handleLogout}>로그아웃</button>
	</div>

	<h1 class="mb-4 text-2xl font-bold">IC-PBL 토론실 예약</h1>

	<!-- 날짜 선택 탭 -->
	<div class="mb-4 flex flex-wrap justify-center gap-2">
		{#each dates as d}
			<button
				class="rounded-md border-2 px-3 py-1 text-sm font-semibold
				{d === date ? 'border-blue-500 bg-blue-100' : 'border-transparent bg-gray-100'}"
				on:click={() => {
					date = d;
					reservations = [];
					fetchData();
				}}
			>
				{formatDateKorean(d)}
			</button>
		{/each}
	</div>

	<!-- 각 방별 시간 예약 버튼 -->
	{#each rooms as room}
		<div class="mb-8">
			<h3 class="mb-2 text-left text-lg font-semibold">{room.name}</h3>
			<div class="flex flex-wrap justify-start gap-2 sm:gap-3">
				{#each HOURS as hour}
					<button
						class="min-w-[2.4rem] h-10 rounded-md px-2 text-sm font-bold text-white
						{isPast(hour)
							? 'cursor-not-allowed bg-gray-400'
							: isMine(room.id, hour)
								? 'bg-red-500'
								: isReserved(room.id, hour)
									? 'cursor-not-allowed bg-gray-300'
									: 'bg-blue-500 hover:bg-blue-600'}"
						on:click={() => handleClick(room.id, hour)}
						disabled={isPast(hour)}
					>
						{hour}
					</button>
				{/each}
			</div>
		</div>
	{/each}
</main>

