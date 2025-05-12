<!-- src/routes/lecture/+page.svelte -->
<script lang="ts">
	import { auth } from '$lib/stores/auth';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	let userId: string | null;
	let userName: string | null;
	let error: string | null = null;
	let reservationDate: string | null = null;
	let selectedClassroom: string | null = null;
	let startTime: string | null = null;
	let endTime: string | null = null;
	let purpose: string = '';
	let attendees: number | null = null;
	let email: string = '';
	let tel: string = '';
	let existingReservations: Array<{ start_time: string; end_time: string }> = [];

	// 시간 옵션: 30분 간격 (09:00 ~ 21:30, 2시간 제한 고려)
	const timeOptions = Array.from({ length: 26 }, (_, i) => {
		const hours = Math.floor(i / 2) + 9;
		const minutes = i % 2 === 0 ? '00' : '30';
		return `${hours.toString().padStart(2, '0')}:${minutes}:00`;
	});

	// 종료 시간 옵션: 30분, 1시간, 1시간 30분, 2시간
	const durationOptions = [
		{ label: '30분', minutes: 30 },
		{ label: '1시간', minutes: 60 },
		{ label: '1시간 30분', minutes: 90 },
		{ label: '2시간', minutes: 120 }
	];

	// 운영 시간
	const operatingStart = '09:00:00';
	const operatingEnd = '22:00:00';

	// URL에서 reservation_date 가져오기
	$: {
		reservationDate = $page.url.searchParams.get('reservation_date');
		if (reservationDate && !/^\d{4}-\d{2}-\d{2}$/.test(reservationDate)) {
			reservationDate = null;
			error = '유효하지 않은 날짜 형식입니다.';
		}
	}

	// 사용자 정보 및 초기 데이터 로드
	$: {
		userId = $auth.id_no;
		userName = $auth.user_name;
		if (userId && browser && reservationDate && selectedClassroom) {
			fetchReservations();
		}
	}

	// 기존 예약 조회
	async function fetchReservations() {
		if (!reservationDate || !selectedClassroom) return;
		try {
			const res = await fetch(
				`/api/classroom-reservations?date=${reservationDate}&classroom_id=${selectedClassroom}`,
				{ credentials: 'include' }
			);
			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.message || '예약 조회에 실패했습니다.');
			}
			existingReservations = data.filter(
				(r: { status: string }) => r.status === 'pending' || r.status === 'approved'
			);
			console.log('Existing reservations:', existingReservations);
		} catch (err) {
			error = err instanceof Error ? err.message : '예약 조회에 실패했습니다.';
		}
	}

	// 시간 문자열을 분으로 변환
	function timeToMinutes(time: string): number {
		const [hours, minutes] = time.split(':').map(Number);
		return hours * 60 + minutes;
	}

	// 분을 시간 문자열로 변환
	function minutesToTime(minutes: number): string {
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`;
	}

	// 가용 시간 확인
	function isTimeAvailable(start: string, durationMinutes: number): boolean {
		if (!start) return false;
		const startMinutes = timeToMinutes(start);
		const endMinutes = startMinutes + durationMinutes;
		const operatingStartMinutes = timeToMinutes(operatingStart);
		const operatingEndMinutes = timeToMinutes(operatingEnd);

		// 운영 시간 내 확인
		if (endMinutes > operatingEndMinutes || startMinutes < operatingStartMinutes) {
			return false;
		}

		// 기존 예약과 충돌 확인
		for (const reservation of existingReservations) {
			const resStart = timeToMinutes(reservation.start_time);
			const resEnd = timeToMinutes(reservation.end_time);
			if (
				(startMinutes < resEnd && endMinutes > resStart) // 겹침
			) {
				return false;
			}
		}
		return true;
	}

	// 종료 시간 선택
	function selectDuration(minutes: number) {
		if (!startTime) return;
		const startMinutes = timeToMinutes(startTime);
		const endMinutes = startMinutes + minutes;
		endTime = minutesToTime(endMinutes);
	}

	// 예약 제출
	async function submitReservation() {
		if (!userId || !selectedClassroom || !reservationDate || !startTime || !endTime || !purpose || !attendees) {
			error = '모든 필수 필드를 입력해주세요.';
			return;
		}
		try {
			const res = await fetch('/api/classroom-reservations', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					user_id: userId,
					classroom_id: selectedClassroom,
					reservation_date: reservationDate,
					start_time: startTime,
					end_time: endTime,
					purpose,
					attendees,
					email,
					tel,
					day_of_week: new Date(reservationDate).toLocaleDateString('ko-KR', { weekday: 'long' })
				}),
				credentials: 'include'
			});
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.message || '예약 신청에 실패했습니다.');
			}
			error = null;
			goto('/');
		} catch (err) {
			error = err instanceof Error ? err.message : '예약 신청에 실패했습니다.';
		}
	}
</script>

<main class="mx-auto max-w-md space-y-6 p-6 text-neutral-800">
	<h1 class="text-2xl font-semibold text-center">강의실 예약 신청</h1>

	{#if error}
		<div class="text-center text-red-500 bg-red-100 p-4 rounded">
			<p>{error}</p>
		</div>
	{/if}

	<div class="space-y-4">
		<!-- 날짜 표시 -->
		<div>
			<label for="re_date"class="block text-sm font-medium text-gray-700">예약 날짜</label>
			<div class="mt-1 text-lg font-semibold text-gray-800">
				{#if reservationDate}
					{new Date(reservationDate).toLocaleDateString('ko-KR', {
						month: 'numeric',
						day: 'numeric',
						weekday: 'short'
					})}
				{:else}
					날짜를 선택해주세요
				{/if}
			</div>
		</div>

		<!-- 강의실 선택 -->
		<div>
			<label for="classroom" class="block text-sm font-medium text-gray-700">강의실</label>
			<select
				id="classroom"
				bind:value={selectedClassroom}
				class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
				on:change={fetchReservations}
			>
				<option value="" disabled selected>강의실 선택</option>
				<!-- 실제 강의실 목록은 DB에서 동적 로드 필요 -->
				<option value="Y201-0107">경상관 107호</option>
				<!-- 추가 강의실 -->
			</select>
		</div>

		<!-- 시작 시간 선택 -->
		<div>
			<label for="start-time" class="block text-sm font-medium text-gray-700">시작 시간</label>
			<select
				id="start-time"
				bind:value={startTime}
				on:change={() => (endTime = null)}
				class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
			>
				<option value="" disabled selected>시작 시간 선택</option>
				{#each timeOptions as time}
					<option value={time}>{time.slice(0, 5)}</option>
				{/each}
			</select>
		</div>

		<!-- 종료 시간 선택 -->
		{#if startTime}
			<div>
				<label for="re_date" class="block text-sm font-medium text-gray-700">예약 시간</label>
				<div class="mt-1 flex space-x-2">
					{#each durationOptions as option}
						{#if isTimeAvailable(startTime, option.minutes)}
							<button
								on:click={() => selectDuration(option.minutes)}
								class="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-indigo-100"
								class:bg-indigo-500={endTime === minutesToTime(timeToMinutes(startTime) + option.minutes)}
								class:text-white={endTime === minutesToTime(timeToMinutes(startTime) + option.minutes)}
							>
								{option.label}
							</button>
						{/if}
					{/each}
				</div>
				{#if endTime}
					<div class="mt-2 text-sm text-gray-600">
						종료 시간: {endTime.slice(0, 5)}
					</div>
				{/if}
			</div>
		{/if}

		<!-- 예약 정보 입력 -->
		<div>
			<label for="purpose" class="block text-sm font-medium text-gray-700">예약 목적</label>
			<input
				id="purpose"
				bind:value={purpose}
				type="text"
				class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
				placeholder="예: 세미나"
			/>
		</div>
		<div>
			<label for="attendees" class="block text-sm font-medium text-gray-700">참여 인원</label>
			<input
				id="attendees"
				bind:value={attendees}
				type="number"
				min="1"
				class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
				placeholder="인원 수"
			/>
		</div>
		<div>
			<label for="email" class="block text-sm font-medium text-gray-700">이메일 (선택)</label>
			<input
				id="email"
				bind:value={email}
				type="email"
				class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
				placeholder="example@domain.com"
			/>
		</div>
		<div>
			<label for="tel" class="block text-sm font-medium text-gray-700">연락처 (선택)</label>
			<input
				id="tel"
				bind:value={tel}
				type="tel"
				class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
				placeholder="010-1234-5678"
			/>
		</div>

		<!-- 제출 버튼 -->
		<button
			on:click={submitReservation}
			class="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-gray-400"
			disabled={!selectedClassroom || !startTime || !endTime || !purpose || !attendees}
		>
			예약 신청
		</button>
	</div>
</main>