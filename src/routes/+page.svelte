<!-- src/routes/+page.svelte -->
<script lang="ts">
	import { auth } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import type { MyReservation, MySeatUsage } from '$lib/types';

	let userId: string | null;
	let userName: string | null;
	let reservations: MyReservation[] = [];
	let seatUsages: MySeatUsage[] = [];
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
			error = null;
		} catch (err) {
			error = err instanceof Error ? err.message : '데이터를 불러오지 못했습니다.';
		}
	}

	function formatKSTRange(start: string, end?: string): string {
		const startDate = new Date(start);
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
		if (!end) return `${date} ${startTime} ~ 사용중`;
		const endTime = new Date(end).toLocaleTimeString('ko-KR', {
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		});
		return `${date} ${startTime} ~ ${endTime}`;
	}

	function getStatus(item: MyReservation | MySeatUsage) {
		const now = new Date();
		const start = new Date(item.start_time);
		const end = item.end_time ? new Date(item.end_time) : null;
		const actualEnd =
			'actual_end_time' in item && item.actual_end_time ? new Date(item.actual_end_time) : null;
		if (actualEnd) return '완료';
		if (end && now >= end) return '완료';
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
					credentials: 'include'
				});
				if (!res.ok) {
					if (res.status === 401) {
						error = '세션이 만료되었습니다. 다시 로그인해주세요.';
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
				// alert(err instanceof Error ? err.message : '퇴실을 실패했습니다.');
				throw err;
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
									{formatKSTRange(r.start_time, r.end_time)}
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
									{formatKSTRange(s.start_time, s.end_time)}
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
		</div>
	{/if}
</main>
