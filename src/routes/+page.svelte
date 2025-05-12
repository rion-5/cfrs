<!-- src/routes/+page.svelte -->
<script lang="ts">
	import { auth } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import type { MyReservation, MySeatUsage, ClassroomReservation } from '$lib/types';

	let userId: string | null;
	let userName: string | null;
	let reservations: MyReservation[] = [];
	let seatUsages: MySeatUsage[] = [];
	let classroomReservations: ClassroomReservation[] = [];
	let error: string | null = null;

	function handleSelect(type: 'STUDY' | 'READING' | 'LECTURE') {
		goto(`/${type.toLowerCase()}`);
	}

	async function fetchData() {
		if (!userId) {
			error = '로그인이 필요합니다.';
			return;
		}
		try {
			const res = await fetch(`/api/my-reservations`, {
				credentials: 'include'
			});
			const data = await res.json();
			if (!res.ok) {
				if (res.status === 401) {
					error = '세션이 만료되었습니다. 다시 로그인해주세요.';
					return;
				}
				throw new Error(data.message || '예약 조회에 실패했습니다.');
			}
			reservations = data.reservations;
			seatUsages = data.seatUsages;
			classroomReservations = data.classroomReservations;
			error = null;
			console.log('Data:', { reservations, seatUsages, classroomReservations });
		} catch (err) {
			error = err instanceof Error ? err.message : '데이터를 불러오지 못했습니다.';
		}
	}

	function formatKSTRange(item: MyReservation | MySeatUsage | ClassroomReservation): string {
		let startDateStr: string;
		let endDateStr: string | undefined;

		// ClassroomReservation의 경우 reservation_date와 start_time, end_time 결합
		if ('reservation_date' in item) {
			const tempDate = item.reservation_date.split('T')[0];
			startDateStr = `${tempDate}T${item.start_time}`;
			endDateStr = item.end_time ? `${tempDate}T${item.end_time}` : undefined;
			console.log('ClassroomReservation date:', { tempDate, startDateStr, endDateStr });
		} else {
			// MyReservation, MySeatUsage는 ISO 형식 가정
			startDateStr = item.start_time;
			endDateStr = item.end_time;
			console.log('Other reservation date:', { startDateStr, endDateStr });
		}

		const startDate = new Date(startDateStr);
		if (isNaN(startDate.getTime())) {
			console.error('Invalid start date:', startDateStr, 'Item:', item);
			return '유효하지 않은 시간';
		}

		const date = startDate.toLocaleDateString('ko-KR', {
			month: 'numeric',
			day: 'numeric',
			weekday: 'short'
		});
		const startTime = startDate.toLocaleTimeString('ko-KR', {
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		});

		if (!endDateStr) {
			return `${date} ${startTime} ~ 사용중`;
		}

		const endDate = new Date(endDateStr);
		if (isNaN(endDate.getTime())) {
			console.error('Invalid end date:', endDateStr, 'Item:', item);
			return `${date} ${startTime} ~ 유효하지 않은 종료 시간`;
		}

		const endTime = endDate.toLocaleTimeString('ko-KR', {
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		});

		return `${date} ${startTime} ~ ${endTime}`;
	}

	function getStatus(item: MyReservation | MySeatUsage | ClassroomReservation) {
		// ClassroomReservation의 경우 status 직접 사용
		if ('reservation_date' in item) {
			switch (item.status) {
				case 'pending':
					return '대기중';
				case 'approved':
					return '승인';
				case 'rejected':
					return '거절';
				default:
					console.error('Invalid status:', item.status, 'Item:', item);
					return '알 수 없음';
			}
		}

		// MyReservation, MySeatUsage는 시간 기반 상태
		const now = new Date();
		const start = new Date(item.start_time);
		const end = item.end_time ? new Date(item.end_time) : null;
		const actualEnd =
			'actual_end_time' in item && item.actual_end_time ? new Date(item.actual_end_time) : null;

		if (isNaN(start.getTime())) {
			console.error('Invalid start date in getStatus:', item.start_time, 'Item:', item);
			return '알 수 없음';
		}

		if (actualEnd) return '완료';
		if (end && !isNaN(end.getTime()) && now >= end) return '완료';
		if (now >= start) return '사용중';
		return '예약중';
	}
async function handleCancelReservation(reservationId: number) {
		if (confirm('예약을 취소하시겠습니까?')) {
			try {
				const res = await fetch('/api/reservations', {
					method: 'DELETE',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ id: reservationId, user_id: userId }),
					credentials: 'include' // 쿠키 포함
				});
				if (!res.ok) {
					if (res.status === 401) {
						error = '세션이 만료되었습니다. 다시 로그인해주세요.';
						goto('/login');
						return;
					}
					throw new Error('예약 취소에 실패했습니다.');
				}
				await fetchData();
			} catch (err) {
				// alert(err instanceof Error ? err.message : '예약 취소에 실패했습니다.');
				throw err;
			}
		}
	}
	async function handleCancelClassRoomReservation(reservationId: number) {
		if (confirm('예약을 취소하시겠습니까?')) {
			try {
				const res = await fetch(`/api/classroom-reservations?reservation_id=${reservationId}`, {
					method: 'DELETE',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ user_id: userId }),
					credentials: 'include'
				});
				if (!res.ok) {
					if (res.status === 401) {
						error = '세션이 만료되었습니다. 다시 로그인해주세요.';
						return;
					}
					const data = await res.json();
					throw new Error(data.error || '예약 취소에 실패했습니다.');
				}
				await fetchData();
			} catch (err) {
				error = err instanceof Error ? err.message : '예약 취소에 실패했습니다.';
			}
		}
	}

	async function handleCancelSeatUsage(seatId: number) {
		if (confirm('퇴실 하시겠습니까?')) {
			try {
				const res = await fetch('/api/reading-seats', {
					method: 'DELETE',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ seat: seatId }),
					credentials: 'include'
				});
				if (!res.ok) {
					if (res.status === 401) {
						error = '세션이 만료되었습니다. 다시 로그인해주세요.';
						return;
					}
					throw new Error('퇴실을 실패했습니다.');
				}
				await fetchData();
			} catch (err) {
				error = err instanceof Error ? err.message : '퇴실을 실패했습니다.';
			}
		}
	}

	$: {
		userId = $auth.id_no;
		userName = $auth.user_name;
		if (userId && browser) {
			fetchData();
		}
	}
</script>

<main class="mx-auto max-w-md space-y-8 p-6 text-center text-neutral-800">
	{#if error}
		<div class="text-center text-red-500 bg-red-100 p-4 rounded">
			<p>{error}</p>
		</div>
	{:else}
		<div class="text-base text-neutral-600">어떤 공간을 예약하시겠어요?</div>

		<div class="grid grid-cols-3 gap-4">
			<button
				class="flex aspect-square flex-col items-center justify-center rounded-xl border border-gray-300 p-2 text-sm font-semibold text-gray-800 shadow-sm hover:bg-orange-100"
				on:click={() => handleSelect('STUDY')}
			>
				<span class="text-2xl">💬</span>
				<span class="mt-1 text-center text-xs leading-tight">IC-PBL<br />토론실</span>
			</button>
			<button
				class="flex aspect-square flex-col items-center justify-center rounded-xl border border-gray-300 p-2 text-sm font-semibold text-blue-800 shadow-sm hover:bg-blue-100"
				on:click={() => handleSelect('READING')}
			>
				<span class="text-2xl">📖</span>
				<span class="mt-1 text-center text-xs leading-tight">도담<br />열람실</span>
			</button>
			<button
				class="flex aspect-square flex-col items-center justify-center rounded-xl border border-gray-300 p-2 text-sm font-semibold text-red-800 shadow-sm hover:bg-yellow-100"
				on:click={() => handleSelect('LECTURE')}
			>
				<span class="text-2xl">🎓</span>
				<span class="mt-1 text-center text-xs leading-tight">강의실</span>
			</button>
		</div>

		<div class="mt-6 space-y-4">
			<h2 class="text-left text-base font-semibold">💬 토론실 예약 현황</h2>
			{#if reservations.length > 0}
				<div class="space-y-2">
					{#each reservations as r}
						<div
							class="flex items-center justify-between space-x-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm"
						>
							<div
								class="min-w-[56px] rounded px-2 py-1 text-center text-xs font-semibold text-white"
								class:bg-blue-500={getStatus(r) === '예약중'}
								class:bg-green-500={getStatus(r) === '사용중'}
								class:bg-gray-400={getStatus(r) === '완료'}
							>
								{getStatus(r)}
							</div>
							<div class="flex-1 text-left">
								<div class="font-semibold">토론실 {r.room_name}</div>
								<div class="text-xs text-gray-500">
									{formatKSTRange(r)}
								</div>
							</div>
							<div class="flex items-center space-x-1">
								{#if getStatus(r) === '예약중'}
									<button
										class="rounded border border-red-300 px-2 py-1 text-xs text-red-500 hover:bg-red-100"
										on:click={() => handleCancelReservation(r.id)}
									>
										취소
									</button>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<div class="text-sm text-gray-400">예정된 예약이 없습니다.</div>
			{/if}

			<h2 class="text-left text-base font-semibold">📖 열람실 이용 현황</h2>
			{#if seatUsages.length > 0}
				<div class="space-y-2">
					{#each seatUsages as s}
						<div
							class="flex items-center justify-between space-x-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm"
						>
							<div
								class="min-w-[56px] rounded px-2 py-1 text-center text-xs font-semibold text-white"
								class:bg-blue-500={getStatus(s) === '예약중'}
								class:bg-green-500={getStatus(s) === '사용중'}
								class:bg-gray-400={getStatus(s) === '완료'}
							>
								{getStatus(s)}
							</div>
							<div class="flex-1 text-left">
								<div class="font-semibold">좌석 {s.seat_number}</div>
								<div class="text-xs text-gray-500">
									{formatKSTRange(s)}
								</div>
							</div>
							<div class="flex items-center space-x-1">
								{#if getStatus(s) === '예약중' || getStatus(s) === '사용중'}
									<button
										class="rounded border border-red-300 px-2 py-1 text-xs text-red-500 hover:bg-red-100"
										on:click={() => handleCancelSeatUsage(s.seat_number)}
									>
										퇴실
									</button>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<div class="text-sm text-gray-400">현재 이용 중인 좌석이 없습니다.</div>
			{/if}

			<h2 class="text-left text-base font-semibold">🎓 강의실 예약 현황</h2>
			{#if classroomReservations.length > 0}
				<div class="space-y-2">
					{#each classroomReservations as cr}
						<div
							class="flex items-center justify-between space-x-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm"
						>
							<div
								class="min-w-[56px] rounded px-2 py-1 text-center text-xs font-semibold text-white"
								class:bg-blue-500={getStatus(cr) === '대기중'}
								class:bg-green-500={getStatus(cr) === '승인'}
								class:bg-red-500={getStatus(cr) === '거절'}
							>
								{getStatus(cr)}
							</div>
							<div class="flex-1 text-left">
								<div class="font-semibold">강의실 {cr.room_number || cr.classroom_id}</div>
								<div class="text-xs text-gray-500">
									{formatKSTRange(cr)}
								</div>
							</div>
							<div class="flex items-center space-x-1">
								{#if getStatus(cr) === '대기중'}
									<button
										class="rounded border border-red-300 px-2 py-1 text-xs text-red-500 hover:bg-red-100"
										on:click={() => handleCancelClassRoomReservation(cr.reservation_id)}
									>
										취소
									</button>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<div class="text-sm text-gray-400">예정된 예약이 없습니다.</div>
			{/if}
		</div>
	{/if}
</main>