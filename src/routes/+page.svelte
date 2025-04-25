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
	function formatKST(utcString: string): string {
		const kst = new Date(utcString);
		// KST 보정 (UTC+9)
		kst.setHours(kst.getHours() + 0);

		const date = kst.toLocaleDateString('ko-KR', {
			month: 'numeric',
			day: 'numeric',
			weekday: 'short'
		});
		const time = kst.toLocaleTimeString('ko-KR', {
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		});
		return `${date} ${time}`;
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
    console.log(`now ${now}  end ${end}`);
		if (actualEnd) return '완료';
		if (now >= end) return '완료';
		if (now >= start) return '퇴실';
		return '예약';
	}

	function handleCheckOut(reservationId: number) {
		// 퇴실 처리 API 호출 예정
		alert(`퇴실 처리: ${reservationId}`);
	}
</script>

<main class="mx-auto max-w-md space-y-8 p-6 text-center text-neutral-800">
	<div class="flex items-center justify-between p-4">
		<div class="text-lg font-semibold">{userName} 님</div>
		<button class="text-sm text-red-500 hover:underline" on:click={handleLogout}>로그아웃</button>
	</div>

	<div class="text-base text-neutral-600">어떤 공간을 예약하시겠어요?</div>

	<div class="grid gap-3">
		<button
			class="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm
      font-medium text-gray-800 transition-colors hover:bg-orange-100"
			on:click={() => handleSelect('STUDY')}>IC-PBL 토론실</button
		>
		<button
			class="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm
      font-medium text-gray-800 transition-colors hover:bg-blue-100">도담</button
		>
		<button
			class="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm
      font-medium text-red-800 transition-colors hover:bg-yellow-100">강의실</button
		>
	</div>
	<div class="mt-6 space-y-4">
		<h2 class="text-left text-base font-semibold">📌 예약 현황</h2>

		{#if reservations.length > 0}
			<div class="space-y-2">
				{#each reservations as r}
					<div class="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
						<div class="flex justify-between text-sm text-gray-700">
							<div>
								<div class="text-base font-semibold">{r.room_name}</div>
								<div class="text-xs text-gray-500">
									{formatKST(r.start_time)} ~ {formatKST(r.end_time)}
								</div>
								<!-- <div class="text-xs text-gray-500">{formatKST(r.start_time)} ~ {formatKST(r.end_time)}</div> -->
							</div>
							<!-- <div class="flex items-center space-x-2">
								{#if !r.actual_end_time && new Date() < new Date(r.start_time)}
									<span class="font-medium text-blue-500">예약중</span>
								{:else if !r.actual_end_time && new Date() >= new Date(r.start_time)}
									<button
										class="rounded border border-red-300 px-2 py-1 text-xs text-red-500 hover:bg-red-100"
										on:click={() => handleCheckOut(r.id)}
									>
										퇴실
									</button>
								{:else}
									<span class="text-xs text-gray-400">완료</span>
								{/if}
							</div> -->
							<div class="flex items-center space-x-2">
								{#if getStatus(r) === '예약'}
									<span class="font-medium text-blue-500">예약중</span>
								{:else if getStatus(r) === '퇴실'}
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
					</div>
				{/each}
			</div>
		{:else}
			<div class="text-sm text-gray-400">예정된 예약이 없습니다.</div>
		{/if}
	</div>
</main>
