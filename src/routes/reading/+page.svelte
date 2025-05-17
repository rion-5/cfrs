<!-- src/routes/reading/+page.svelte -->
<script lang="ts">
	import { auth } from '$lib/stores/auth';
	import { get } from 'svelte/store';

	let mySeat: number | null = null;
	let usedSeats: number[] = [];
	let userId: string | null;
	let userName: string | null;
	let userInZone = false;
	let error: string | null = null;

	const map = [
		[1, 2, 3, 4, 5, null, 6, 7, null, 51],
		[null, null, null, null, null, null, null, null, null, 52],
		[8, 9, 10, 11, 12, null, 13, 14, null, 53],
		[15, 16, 17, 18, 19, null, 20, 21, null, 54],
		[null, null, null, null, null, null, null, null, null, 55],
		[22, 23, 24, 25, 26, null, 27, 28, null, 56],
		[29, 30, 31, 32, 33, null, 34, 35, null, 57],
		[null, null, null, null, null, null, null, null, null, 58],
		[36, 37, 38, 39, 40, null, 41, 42, null, 59],
		[43, 44, 45, 46, 47, null, null, null, null, 60],
		[null, null, null, null, null, null, null, null, null, null],
		[null, null, 48, 49, 50, null, null, null, null, null]
	];

	async function fetchSeatStatus() {
		if (!userId) {
			error = '로그인이 필요합니다.';
			return;
		}
		try {
			const response = await fetch('/api/reading-seats', {
				credentials: 'include'
			});
			const data = await response.json();
			if (!response.ok) {
				if (response.status === 401) {
					error = '세션이 만료되었습니다. 다시 로그인해주세요.';
					return;
				}
				throw new Error(data.message || '현황을 불러오지 못했습니다.');
			}
			usedSeats = data.usedSeats;
			mySeat = data.mySeat;
			error = null;
		} catch (err) {
			error = err instanceof Error ? err.message : '좌석 정보를 불러오지 못했습니다.';
		}
	}

	async function handleSeatClick(seat: number) {
		try {
			if (mySeat === seat) {
				if (confirm(`${seat}번 좌석 퇴실하시겠습니까?`)) {
					const res = await fetch('/api/reading-seats', {
						method: 'DELETE',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ seat }),
						credentials: 'include'
					});
					const data = await res.json();
					if (!res.ok) {
						if (res.status === 401) {
							error = '세션이 만료되었습니다. 다시 로그인해주세요.';
							return;
						}
						throw new Error(data.message || '퇴실 실패');
					}
					await fetchSeatStatus();
				}
			} else if (!usedSeats.includes(seat)) {
				if (confirm(`${seat}번 좌석을 이용 등록하시겠습니까?`)) {
					const res = await fetch('/api/reading-seats', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ seat, name: userName }),
						credentials: 'include'
					});
					const data = await res.json();
					if (!res.ok) {
						if (res.status === 401) {
							error = '세션이 만료되었습니다. 다시 로그인해주세요.';
							return;
						}
						throw new Error(data.message || '등록 실패');
					}
					await fetchSeatStatus();
				}
			}
		} catch (err) {
			alert(err instanceof Error ? err.message : '작업 실패');
		}
	}

	function checkLocation() {
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				const { latitude, longitude } = pos.coords;
				const roomLat = 37.2996,
					roomLng = 126.8360;
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

	// 초기 데이터 로드
	$: {
		userId = $auth.id_no;
		userName = $auth.user_name;
		if (userId) {
			fetchSeatStatus();
			// checkLocation();
		}
	}
</script>

<main class="mx-auto max-w-screen-md space-y-8 px-4 py-6 text-center text-neutral-800 sm:px-6 lg:px-8">
	{#if error}
		<div class="text-center text-red-500 bg-red-100 p-4 rounded">
			<p>{error}</p>
		</div>
	{:else}
		<h1 class="text-center text-2xl font-bold">도담 📖열람실 이용 등록</h1>
		<!-- 색상 안내 -->
		<div class="mt-4 text-xs text-gray-600">
			<span class="inline-block h-3 w-3 bg-white border border-gray-300 mr-1"></span> 사용가능
			<span class="inline-block h-3 w-3 bg-indigo-500 mr-1 ml-4"></span> 내좌석
			<span class="inline-block h-3 w-3 bg-gray-400 mr-1 ml-4"></span> 사용중
		</div>
		<!-- Seat Map Layout -->
		<div class="flex justify-center">
			<div
				class="grid gap-1 sm:gap-2"
				style="grid-template-columns: repeat({map[0].length}, minmax(28px, 32px));"
			>
				{#each map as row}
					{#each row as seat}
						{#if seat === null}
							<div class="h-7 w-7 sm:h-8 sm:w-8"></div>
						{:else}
							<button
								class="h-8 w-8 sm:h-9 sm:w-9 rounded-md text-sm font-bold
									{mySeat === seat
										? 'bg-indigo-500'
										: usedSeats.includes(seat)
											? 'cursor-not-allowed bg-gray-400'
											: 'bg-white border border-gray-300 text-gray-800 hover:bg-gray-100 hover:border-gray-500'}"
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
	{/if}
</main>