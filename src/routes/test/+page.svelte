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

	// Map data from the original SVG
	const map = [
		[1, 2, 3, 4, 5, null, 39, 40, null, 51],
		[6, 7, 8, 9, 10, null, 41, 42, null, 52],
		[11, 12, 13, 14, 15, null, 43, 44, null, 53],
		[null, null, null, null, null, null, null, null, null, 54],
		[16, 17, 18, 19, 20, null, 45, 46, null, 55],
		[21, 22, 23, 24, 25, null, 47, 48, null, 56],
		[null, null, null, null, null, null, null, null, null, 57],
		[26, 27, 28, 29, 30, null, 49, 50, null, 58],
		[31, 32, 33, 34, 35, null, null, null, null, 59],
		[null, null, 36, 37, 38, null, null, null, null, 60]
	];

	const cellWidth = 40;
	const cellHeight = 24;
	const padding = 6;

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
					roomLng = 127.5678;
				const distance = getDistanceFromLatLonInMeters(latitude, longitude, roomLat, roomLng);
				userInZone = distance < 100;
			},
			(err) => {
				console.error('위치 정보 확인 실패', err);
				userInZone = false;
			}
		);
	}

	function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
		const R = 6371000;
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

<main
	class="mx-auto max-w-screen-md space-y-8 px-4 py-6 text-center text-neutral-800 sm:px-6 lg:px-8"
>
	<!-- 상단 네비게이션 -->
	<div class="flex items-center justify-between px-2 sm:px-4">
		<button on:click={goHome} class="text-sm text-blue-600 hover:underline">← Home</button>
		<button class="text-sm text-red-500 hover:underline" on:click={handleLogout}>로그아웃</button>
	</div>
	<h1 class="text-center text-2xl font-bold">도담 📖열람실 이용 등록</h1>

	<svg
		width={map[0].length * (cellWidth + padding)}
		height={map.length * (cellHeight + padding)}
		style="background-color: white; max-width: 100%; height: auto;"
	>
		{#each map as row, rowIndex}
			{#each row as seat, colIndex}
				{#if seat}
					<g
						role="button"
						tabindex={usedSeats.includes(seat) && mySeat !== seat ? -1 : 0}
						on:click={() => handleSeatClick(seat)}
						on:keydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								handleSeatClick(seat);
							}
						}}
						style="cursor: {usedSeats.includes(seat) && mySeat !== seat
							? 'not-allowed'
							: 'pointer'}"
						aria-disabled={usedSeats.includes(seat) && mySeat !== seat}
						aria-label={`Seat ${seat} ${mySeat === seat ? 'occupied by you' : usedSeats.includes(seat) ? 'occupied' : 'available'}`}
					>
						<rect
							x={colIndex * (cellWidth + padding)}
							y={rowIndex * (cellHeight + padding)}
							width={cellWidth}
							height={cellHeight}
							fill={mySeat === seat ? 'red' : usedSeats.includes(seat) ? 'gray' : 'yellowgreen'}
							stroke="black"
							stroke-width="1"
							rx="4"
							ry="4"
						/>
						<text
							x={colIndex * (cellWidth + padding) + cellWidth / 2}
							y={rowIndex * (cellHeight + padding) + cellHeight / 2 + 4}
							text-anchor="middle"
							fill="white"
							font-size="12"
							font-family="sans-serif"
						>
							{seat}
						</text>
					</g>
				{/if}
			{/each}
		{/each}
	</svg>
</main>

<style>
	svg {
		max-width: 100%;
		height: auto;
	}
</style>
