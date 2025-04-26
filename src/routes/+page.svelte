<!-- src/routes/+page.svelte -->
<script lang="ts">
	import { auth, logout } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import { get } from 'svelte/store';
	import { onMount } from 'svelte';
	import type { MyReservation } from '$lib/types/MyReservation';

	let userId: string | undefined; //2024987654
	let userName: string | undefined;
	let reservations: MyReservation[] = [];

	const handleSelect = (type: 'STUDY' | 'READING' | 'LECTURE') => {
		goto(`/${type.toLowerCase()}`);
	};

	async function fetchReservations() {
		if (!userId) return;
		const res = await fetch(`/api/my-reservations?user_id=${userId}`);
		reservations = await res.json();
	}

	function handleLogout() {
		logout();
		goto('/login');
	}
	function formatKSTRange(startUtc: string, endUtc: string): string {
		const start = new Date(startUtc);
		const end = new Date(endUtc);

		// KST로 변환
		start.setHours(start.getHours() + 0);
		end.setHours(end.getHours() + 0);

		const date = start.toLocaleDateString('ko-KR', {
			month: 'numeric',
			day: 'numeric',
			weekday: 'short'
		});

		const startTime = start.toLocaleTimeString('ko-KR', {
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		});

		const endTime = end.toLocaleTimeString('ko-KR', {
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		});

		return `${date} ${startTime} ~ ${endTime}`;
	}

	onMount(() => {
		const $auth = get(auth);
		if (!$auth.isLoggedIn) {
			// goto('/login');
			userId = 'A011982';
			userName = '이상근';
			fetchReservations();
		} else {
			userId = $auth.id_no;
			userName = $auth.user_name;
			fetchReservations();
		}
	});

	function getStatus(r: MyReservation) {
		const now = new Date();
		const start = new Date(r.start_time);
		const end = new Date(r.end_time);
		const actualEnd = r.actual_end_time ? new Date(r.actual_end_time) : null;

		if (actualEnd) return '완료';
		if (now >= end) return '완료';
		if (now >= start) return '사용중';
		return '예약중';
	}

	// function handleCheckOut(reservationId: number) {
	// 	// 퇴실 처리 API 호출 예정
	// 	alert(`퇴실 처리: ${reservationId}`);
	// }
	async function handleCancel(reservationId: number) {
		if (confirm('예약을 취소하시겠습니까?')) {
			// fetch(`/api/reservations/${reservationId}`, {
			// 	method: 'DELETE'
			// }).then(() => fetchReservations());
			await fetch('/api/reservations', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: reservationId, user_id: userId })
			});

			await fetchReservations(); // UI 갱신
		}
	}
</script>

<main class="mx-auto max-w-md space-y-8 p-6 text-center text-neutral-800">
	<div class="flex items-center justify-between p-4">
		<div class="text-lg font-semibold">{userName} 님</div>
		<button class="text-sm text-red-500 hover:underline" on:click={handleLogout}>로그아웃</button>
	</div>

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
			<span class="text-2xl">🏫</span>
			<span class="mt-1 text-center text-xs leading-tight">강의실</span>
		</button>
	</div>

	<div class="mt-6 space-y-4">
		<h2 class="text-left text-base font-semibold">📌 예약 현황</h2>

		{#if reservations.length > 0}
			<div class="space-y-2">
				{#each reservations as r}
					<div
						class="flex items-center justify-between space-x-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm"
					>
						<!-- 상태 -->
						<div
							class="min-w-[56px] rounded px-2 py-1 text-center text-xs font-semibold text-white"
							class:bg-blue-500={getStatus(r) === '예약중'}
							class:bg-green-500={getStatus(r) === '사용중'}
							class:bg-gray-400={getStatus(r) === '완료'}
						>
							{getStatus(r)}
						</div>

						<!-- 호실명 + 날짜/시간 -->
						<div class="flex-1 text-left">
							<div class="font-semibold">{r.room_name}</div>
							<div class="text-xs text-gray-500">{formatKSTRange(r.start_time, r.end_time)}</div>
						</div>

						<!-- 버튼 -->
						<div class="flex items-center space-x-1">
							{#if getStatus(r) === '예약중'}
								<button
									class="rounded border border-red-300 px-2 py-1 text-xs text-red-500 hover:bg-red-100"
									on:click={() => handleCancel(r.id)}
								>
									취소
								</button>
								<!-- {:else if getStatus(r) === '사용중'}
			<button
				class="rounded border border-orange-300 px-2 py-1 text-xs text-orange-500 hover:bg-orange-100"
				on:click={() => handleCheckOut(r.id)}
			>
				퇴실
			</button> -->
							{/if}
						</div>
					</div>

					<!-- <div class="rounded-xl border border-gray-200 bg-white p-3 shadow-sm space-y-1">
					<div class="flex justify-between items-center text-sm font-semibold text-gray-800">
						<span>{r.room_name}</span>
						<span
							class={`text-xs px-2 py-0.5 rounded-full ${
								getStatus(r) === '예약중'
									? 'bg-blue-100 text-blue-600'
									: getStatus(r) === '사용중'
									? 'bg-yellow-100 text-yellow-600'
									: 'bg-gray-100 text-gray-500'
							}`}>
							{getStatus(r)}
						</span>
					</div>
					<div class="text-xs text-gray-500">{formatKSTRange(r.start_time, r.end_time)}</div>
					{#if getStatus(r) === '사용중'}
						<button
							class="mt-1 w-full rounded-lg border border-red-300 bg-red-50 py-1 text-xs text-red-600 hover:bg-red-100">
							퇴실
						</button>
					{:else if getStatus(r) === '예약중'}
						<button
							class="mt-1 w-full rounded-lg border border-gray-300 bg-gray-50 py-1 text-xs text-gray-600 hover:bg-gray-100">
							예약 취소
						</button>
					{/if}
				</div> -->

					<!-- <div class="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
						<div class="flex justify-between text-sm text-gray-700">
							<div>
								<div class="text-base font-semibold">{r.room_name} </div>
								<div class="text-xs text-gray-500">
									{formatKSTRange(r.start_time, r.end_time)}
								</div>
							</div>
							<div class="flex items-center space-x-2">
								{#if getStatus(r) === '예약중'}
								<div class="flex items-center gap-2">
									<span class="font-medium text-blue-500">예약중</span>
									<button
										class="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
										on:click={() => handleCancel(r.id)}
									>
										취소
									</button>
								</div>
								{:else if getStatus(r) === '사용중'}
								<div class="flex items-center gap-2">
									<span class="text-orange-500 font-semibold">사용중</span>
									<button
										class="rounded border border-red-300 px-2 py-1 text-xs text-red-500 hover:bg-red-100"
										on:click={() => handleCheckOut(r.id)}
									>
										퇴실
									</button>
								</div>
								{:else}
									<span class="text-xs text-gray-400">완료</span>
								{/if}
							</div>
							
						</div>
					</div> -->
				{/each}
			</div>
		{:else}
			<div class="text-sm text-gray-400">예정된 예약이 없습니다.</div>
		{/if}
	</div>
</main>
