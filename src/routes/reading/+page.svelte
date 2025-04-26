<script lang="ts">
	import { onMount } from 'svelte';
	import { logout,auth } from '$lib/stores/auth';
	import { get } from 'svelte/store';
	import { goto } from '$app/navigation';

	// let seats = Array.from({ length: 60 }, (_, i) => i + 1);
	let mySeat: number | null = null;
	let usedSeats: number[] = [];
	let userId: string | undefined;
	let userName: string | undefined;
	let userInZone = true;

	const totalSeats = 60;
	const seats = Array.from({ length: totalSeats }, (_, i) => i + 1);


	function goHome() {
		goto('/');
	}

	// 10개씩 끊어서 배열로 나누기
	const chunkedSeats: number[][] = [];
	for (let i = 0; i < seats.length; i += 10) {
		chunkedSeats.push(seats.slice(i, i + 10));
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
			// goto('/login?redirect=/reading');
			userId = 'A011982';
			userName = '이상근';
			// checkLocation();
			fetchSeatStatus();
		} else {
			userId = $auth.id_no;
			userName = $auth.user_name;
			// checkLocation();
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

	<div class="flex flex-wrap gap-2">
		{#each seats as seat}
			<button
				class="h-10 w-10 rounded-md font-bold text-white
					{mySeat === seat
						? 'bg-red-500'
						: usedSeats.includes(seat)
							? 'cursor-not-allowed bg-gray-400'
							: 'bg-green-500 hover:bg-green-600'}"
				on:click={() => handleSeatClick(seat)}
				disabled={usedSeats.includes(seat) && mySeat !== seat}
			>
				{seat}
			</button>
		{/each}
	</div>
</main>
