<!-- /src/routes/reading/+page.svelte -->

<script lang="ts">
	import { onMount } from 'svelte';
	import { logout, auth } from '$lib/stores/auth';
	import { get } from 'svelte/store';
	import { goto } from '$app/navigation';

	let mySeat: number | null = null;
	let usedSeats: number[] = [];
	let userId: string | undefined;
	let userName: string | undefined;
	let userInZone = true;

	// 수정된 맵
	const map = [
		[1, 2, 3, 4, 5, null, 39, 40, null, 51],
		[null, null, null, null, null, null, null, null, null, 52],
		[6, 7, 8, 9, 10, null, 41, 42, null, 53],
		[11, 12, 13, 14, 15, null, 43, 44, null, 54],
		[null, null, null, null, null, null, null, null, null, 55],
		[16, 17, 18, 19, 20, null, 45, 46, null, 56],
		[21, 22, 23, 24, 25, null, 47, 48, null, 57],
		[null, null, null, null, null, null, null, null, null, 58],
		[26, 27, 28, 29, 30, null, 49, 50, null, 59],
		[31, 32, 33, 34, 35, null, null, null, null, 60],
		[null, null, null, null, null, null, null, null, null, null],
		[null, null, 36, 37, 38, null, null, null, null, null]
	];

	function goHome() {
		goto('/');
	}

	async function fetchSeatStatus() {
		const res = await fetch('/api/reading-seats');
		const data = await res.json();
		usedSeats = data.usedSeats;
		mySeat = data.mySeat;
	}

	async function handleSeatClick(seat: number) {
		if (!userInZone) {
			alert('열람실 내에서만 등록이 가능합니다.');
			return;
		}

		if (mySeat === seat) {
			if (confirm(`${seat}번 좌석 퇴실하시겠습니까?`)) {
				await fetch('/api/reading-seats', {
					method: 'DELETE',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ seat, user_id: userId })
				});
				await fetchSeatStatus();
			}
		} else if (!usedSeats.includes(seat)) {
			if (confirm(`${seat}번 좌석을 이용 등록하시겠습니까?`)) {
				await fetch('/api/reading-seats', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ seat, user_id: userId, name: userName })
				});
				await fetchSeatStatus();
			}
		}
	}

	function checkLocation() {
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				const { latitude, longitude } = pos.coords;
				const roomLat = 37.1234,
					roomLng = 127.5678; // 실제 열람실 좌표
				const distance = getDistanceFromLatLonInMeters(latitude, longitude, roomLat, roomLng);
				userInZone = distance < 100; // 100m 이내 허용
			},
			(err) => {
				console.error('위치 정보 확인 실패', err);
				userInZone = false;
			}
		);
	}

	function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
		const R = 6371000; // m
		const dLat = ((lat2 - lat1) * Math.PI) / 180;
		const dLon = ((lon2 - lon1) * Math.PI) / 180;
		const a =
			Math.sin(dLat / 2) * Math.sin(dLat / 2) +
			Math.cos((lat1 * Math.PI) / 180) *
				Math.cos((lat2 * Math.PI) / 180) *
				Math.sin(dLon / 2) *
				Math.sin(dLon / 2);
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
		return R * c;
	}

	onMount(() => {
		const $auth = get(auth);
		if (!$auth.isLoggedIn) {
			userId = 'A011982';
			userName = '이상근';
			fetchSeatStatus();
		} else {
			userId = $auth.id_no;
			userName = $auth.user_name;
			fetchSeatStatus();
		}
	});

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
	<h1 class="text-center text-2xl font-bold">도담 📖열람실 이용 등록</h1>

	<!-- Seat Map Layout -->
	<div class="flex justify-center">
		<div
			class="grid gap-1 sm:gap-2"
			style="grid-template-columns: repeat({map[0].length}, minmax(28px, 32px));"
		>
			{#each map as row}
				{#each row as seat}
					{#if seat === null}
						<div class="h-7 w-7 sm:h-8 sm:w-8"></div> <!-- Empty space for null -->
					{:else}
						<button
							class="h-8 w-8 sm:h-9 sm:w-9 rounded-md text-sm font-bold text-white
								{mySeat === seat
									? 'bg-red-500'
									: usedSeats.includes(seat)
										? 'cursor-not-allowed bg-gray-400'
										: 'bg-green-500 hover:bg-green-600'}"
							on:click={() => handleSeatClick(seat)}
							disabled={usedSeats.includes(seat) && mySeat !== seat}
							aria-label="좌석 {seat} {mySeat === seat ? '선택됨' : usedSeats.includes(seat) ? '사용 중' : '사용 가능'}"
						>
							{seat}
						</button>
					{/if}
				{/each}
			{/each}
		</div>
	</div>

	<!-- 색상 안내 -->
	<div class="mt-4 text-sm text-gray-600">
		<span class="inline-block h-4 w-4 bg-green-500 mr-1"></span> 사용 가능
		<span class="inline-block h-4 w-4 bg-red-500 mr-1 ml-4"></span> 내 좌석
		<span class="inline-block h-4 w-4 bg-gray-400 mr-1 ml-4"></span> 사용 중
	</div>
</main>