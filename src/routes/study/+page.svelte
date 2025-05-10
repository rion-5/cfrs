<!-- src/routes/study/+page.svelte -->
<script lang="ts">
	import dayjs from 'dayjs';
	import { onMount } from 'svelte';
	import type { Room, Reservation } from '$lib/types';
	import { auth, logout } from '$lib/stores/auth';
	import { get } from 'svelte/store';
	import { goto } from '$app/navigation';
	import { format } from 'date-fns';
	import { ko } from 'date-fns/locale';
	import { browser } from '$app/environment';

	// dayjs로 KST 현재 시간
	const now = dayjs();

	let availableHours: number[] = [];
	let currentHour: number;
	// Use dayjs to set the current date in KST
	let date = now.format('YYYY-MM-DD');
	let rooms: Room[] = [];
	let reservations: Reservation[] = [];
	let userId: string | null;
	let userName: string | null;
	let isLoading = true; // 로딩 상태 추가
	let error: string | null = null; // 에러 상태 추가

	const HOURS = Array.from({ length: 14 }, (_, i) => i + 9);

	// Generate dates array starting from today (KST) for 4 days
	const dates = Array.from({ length: 4 }, (_, i) => {
		return now.add(i, 'day').format('YYYY-MM-DD');
	});
	let sessionTimeout: NodeJS.Timeout | null = null;
	let sessionWarning = false;

	// 세션 타이머 시작 (2시간)
	function startSessionTimer() {
		if (sessionTimeout) clearTimeout(sessionTimeout);
		sessionTimeout = setTimeout(() => {
			sessionWarning = true;
			setTimeout(() => {
				if (!sessionWarning) return;
				logout();
				goto('/login?redirect=/study');
				// 	}, 5 * 60 * 1000); // 5분 후 로그아웃
				// }, 115 * 60 * 1000); // 115분
			}, 10 * 1000); // 10초 후 로그아웃
		}, 50 * 1000); // 50초
	}

	// 세션 연장
	async function extendSession() {
		try {
			const response = await fetch('/api/auth/extend', { credentials: 'include' });
			if (!response.ok) throw new Error('세션 연장 실패');
			sessionWarning = false;
			startSessionTimer();
		} catch (err) {
			logout();
			goto('/login?redirect=/study');
		}
	}

	// 사용자 활동 시 타이머 리셋
	function resetSessionTimer() {
		if (userId) startSessionTimer();
	}
	function goHome() {
		goto('/');
	}

	// 날짜 포맷 함수
	function formatDateKorean(dateString: string) {
		const dateObj = new Date(dateString);
		const month = dateObj.getMonth() + 1;
		const day = dateObj.getDate();
		const weekday = format(dateObj, 'eee', { locale: ko });
		return `${month}.${day}.${weekday}`;
	}

	async function fetchData() {
		if (!userId) {
			error = '로그인이 필요합니다.';
			isLoading = false;
			return;
		}
		try {
			const roomRes = await fetch('/api/rooms?type=STUDY', {
				credentials: 'include' // 쿠키 포함
			});
			if (!roomRes.ok) {
				if (roomRes.status === 401) {
					error = '세션이 만료되었습니다. 다시 로그인해주세요.';
					goto('/login');
					return;
				}
				throw new Error('현황을 불러오지 못했습니다.');
			}
			rooms = await roomRes.json();

			const resvRes = await fetch(`/api/reservations?inquery_date=${date}`, {
				credentials: 'include' // 쿠키 포함
			});
			if (!resvRes.ok) {
				if (resvRes.status === 401) {
					error = '세션이 만료되었습니다. 다시 로그인해주세요.';
					goto('/login');
					return;
				}
				throw new Error('현황을 불러오지 못했습니다.');
			}
			reservations = await resvRes.json();
			error = null;
			resetSessionTimer();
		} catch (err) {
			error = err instanceof Error ? err.message : '데이터를 불러오지 못했습니다.';
		} finally {
			isLoading = false;
		}
	}
	// 서버에서 인증 상태 확인
	async function verifyAuth() {
		isLoading = true;
		try {
			const response = await fetch('/api/auth/verify', {
				credentials: 'include' // 쿠키 포함
			});
			if (!response.ok) {
				throw new Error('인증 실패');
			}
			const data = await response.json();
			auth.set({
				isLoggedIn: true,
				id_no: data.id_no,
				user_name: data.user_name
			});
			userId = data.id_no;
			userName = data.user_name;
			startSessionTimer();
			await fetchData();
		} catch (err) {
			error = '로그인이 필요합니다.';
			const redirect = new URLSearchParams(window.location.search).get('redirect') || '/study';
			goto(`/login?redirect=${encodeURIComponent(redirect)}`);
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		if (!browser) return; // 서버 사이드 렌더링에서는 실행 안 함
		const $auth = get(auth);
		if (!$auth.isLoggedIn) {
			// goto('/login?redirect=/study');
			verifyAuth(); // 서버에서 인증 확인
		} else {
			userId = $auth.id_no;
			userName = $auth.user_name;
			currentHour = now.hour();
			availableHours = Array.from({ length: 14 }, (_, i) => i + 9);
			startSessionTimer();
			fetchData();
		}
		// 사용자 활동 감지
		['click', 'mousemove', 'keydown'].forEach((event) =>
			window.addEventListener(event, resetSessionTimer)
		);
		return () => {
			if (sessionTimeout) clearTimeout(sessionTimeout);
			['click', 'mousemove', 'keydown'].forEach((event) =>
				window.removeEventListener(event, resetSessionTimer)
			);
		};
	});

	function isPast(hour: number): boolean {
		return date === now.format('YYYY-MM-DD') && hour <= currentHour;
	}

	function isReserved(roomId: number, hour: number): boolean {
		return reservations.some((r) => {
			if (r.room_id !== roomId) return false;
			// const startDate = new Date(r.start_time);
			// const kstHour = startDate.getHours();
			// const kstDateStr = startDate.toISOString().split('T')[0];
			const startDate = dayjs(r.start_time); // UTC ISO → KST
			const kstHour = startDate.hour();
			const kstDateStr = startDate.format('YYYY-MM-DD');
			return kstDateStr === date && kstHour === hour;
		});
	}

	function getMyReservation(roomId: number, hour: number) {
		return reservations.find((r) => {
			// const startDate = new Date(r.start_time);
			// const kstHour = startDate.getHours();
			// const kstDateStr = startDate.toISOString().split('T')[0];
			const startDate = dayjs(r.start_time); // UTC ISO → KST
			const kstHour = startDate.hour();
			const kstDateStr = startDate.format('YYYY-MM-DD');
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
				await fetchData();
			}
		} else if (!reserved) {
			if (confirm(`${hour}시에 예약하시겠습니까?`)) {
				// KST 기준 문자열로 시간 전송
				const start = `${date} ${String(hour).padStart(2, '0')}:00:00`;
				const end = new Date(new Date(start).getTime() + 60 * 60 * 1000)
					.toLocaleString('sv-SE', {
						year: 'numeric',
						month: '2-digit',
						day: '2-digit',
						hour: '2-digit',
						minute: '2-digit',
						second: '2-digit',
						hour12: false
					})
					.replace(' ', ' ');

				const res = await fetch(`/api/reservations`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						room_id: roomId,
						user_id: userId,
						start_time: start,
						end_time: end,
						name: userName,
						email: '',
						phone: ''
					})
				});
				// const data = await res.json();
				// alert(`${data.message}`);

				if (!res.ok) {
					// const message = await res.text();
					// alert(`예약 실패: ${message}`);
					const data = await res.json();
					alert(`예약 실패: ${data.message}`);
					return;
				}
				await fetchData();
			}
		}
	}

	function handleLogout() {
		logout();
		goto('/login');
	}
</script>

<main
	class="mx-auto max-w-screen-md space-y-8 px-4 py-6 text-center text-neutral-800 sm:px-6 lg:px-8"
>
	<!-- 세션 만료 경고 -->
	{#if sessionWarning}
		<div class="fixed top-4 left-1/2 -translate-x-1/2 transform rounded bg-yellow-100 p-4 shadow">
			<p>10초 후 세션이 만료됩니다.</p>
			<button on:click={extendSession} class="mt-2 rounded bg-blue-500 px-2 py-1 text-white">
				세션 연장
			</button>
		</div>
	{/if}
	<!-- 로딩 및 에러 UI -->
	{#if isLoading}
		<div class="text-center">
			<p>로딩 중...</p>
		</div>
	{:else if error}
		<div class="text-center text-red-500">
			<p>{error}</p>
			{#if error.includes('세션이 만료')}
				<a href="/login" class="mt-2 text-sm text-blue-600 hover:underline">로그인</a>
			{:else}
				<button class="mt-2 text-sm text-blue-600 hover:underline" on:click={() => verifyAuth()}>
					재시도
				</button>
			{/if}
		</div>
	{:else}
		<!-- 상단 네비게이션 -->
		<div class="flex items-center justify-between px-2 sm:px-4">
			<button on:click={goHome} class="text-sm text-blue-600 hover:underline">← Home</button>
			<button class="text-sm text-red-500 hover:underline" on:click={handleLogout}>로그아웃</button>
		</div>

		<h1 class="mb-4 text-2xl font-bold">IC-PBL 💬토론실 예약</h1>

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

		<!-- 색상 안내 -->
		<div class="mb-4 text-sm text-gray-600">
			<span class="mr-1 inline-block h-4 w-4 bg-blue-500"></span> 예약가능
			<span class="mr-1 ml-4 inline-block h-4 w-4 bg-red-500"></span> 내 예약
			<span class="mr-1 ml-4 inline-block h-4 w-4 bg-gray-300"></span> 타인예약
			<span class="mr-1 ml-4 inline-block h-4 w-4 bg-gray-400"></span> 예약불가
		</div>

		<!-- 각 방별 시간 예약 버튼 -->
		{#each rooms as room}
			<div class="mb-8">
				<h3 class="mb-2 text-left text-lg font-semibold">토론실 {room.name}</h3>
				<div class="flex justify-center">
					<div class="flex max-w-full flex-wrap justify-start gap-1 sm:gap-2">
						{#each HOURS as hour}
							<button
								class="h-8 w-8 rounded-md text-sm font-bold text-white sm:h-9 sm:w-10
                {isPast(hour)
									? 'cursor-not-allowed bg-gray-400'
									: isMine(room.id, hour)
										? 'bg-red-500'
										: isReserved(room.id, hour)
											? 'cursor-not-allowed bg-gray-300'
											: 'bg-blue-500 hover:bg-blue-600'}"
								on:click={() => handleClick(room.id, hour)}
								disabled={isPast(hour) || (isReserved(room.id, hour) && !isMine(room.id, hour))}
								aria-label="{hour}시 {isPast(hour)
									? '예약 불가'
									: isMine(room.id, hour)
										? '내 예약'
										: isReserved(room.id, hour)
											? '타인 예약'
											: '예약 가능'}"
							>
								{hour}
							</button>
						{/each}
					</div>
				</div>
			</div>
		{/each}
	{/if}
</main>
