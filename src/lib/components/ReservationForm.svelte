<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { reservationStore } from '$lib/stores/reservation';
	import { auth } from '$lib/stores/auth';
	import type { ClassroomAvailability, ReservationFormData } from '$lib/types';

	export let classroom: { classroom: ClassroomAvailability; slot: { start: string; end: string } };
	export let date: Date;

	const dispatch = createEventDispatcher();
	let purpose = '';
	let attendees: number | null = null;
	let email = '';
	let tel = '';
	let endTime: string | null = null;
	let error: string | null = null;

	// 종료 시간 옵션
	const durationOptions = [
		{ label: '30분', minutes: 30 },
		{ label: '1시간', minutes: 60 },
		{ label: '1시간 30분', minutes: 90 },
		{ label: '2시간', minutes: 120 }
	];

	// 운영 시간
	const operatingStart = '09:00:00';
	const operatingEnd = '22:00:00';

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
		const startMinutes = timeToMinutes(start);
		const endMinutes = startMinutes + durationMinutes;
		const operatingStartMinutes = timeToMinutes(operatingStart);
		const operatingEndMinutes = timeToMinutes(operatingEnd);

		// 운영 시간 내 확인
		if (endMinutes > operatingEndMinutes || startMinutes < operatingStartMinutes) {
			return false;
		}

		// 기존 예약과 충돌 확인
		const reservations = $reservationStore.reservations.filter(
			(r) =>
				r.classroom_id === classroom.classroom.classroom_id &&
				r.reservation_date === formatDateToYYYYMMDD(date) &&
				(r.status === 'pending' || r.status === 'approved')
		);
		for (const reservation of reservations) {
			const resStart = timeToMinutes(reservation.start_time);
			const resEnd = timeToMinutes(reservation.end_time);
			if (startMinutes < resEnd && endMinutes > resStart) {
				return false;
			}
		}
		return true;
	}

	// 종료 시간 선택
	function selectDuration(minutes: number) {
		const startMinutes = timeToMinutes(classroom.slot.start);
		const endMinutes = startMinutes + minutes;
		endTime = minutesToTime(endMinutes);
	}

	// 날짜 포맷팅
	function formatDateToYYYYMMDD(date: Date): string {
		return date.toISOString().split('T')[0];
	}

	// 폼 제출
	function submit() {
		if (!purpose || !attendees || !endTime) {
			error = '모든 필수 필드를 입력해주세요.';
			return;
		}
		if (!$auth.id_no) {
			error = '사용자 인증 정보가 없습니다. 다시 로그인해주세요.';
			return;
		}
		const formData: ReservationFormData = {
			user_id: $auth.id_no,
			classroom_id: classroom.classroom.classroom_id,
			reservation_date: formatDateToYYYYMMDD(date),
			start_time: classroom.slot.start,
			end_time: endTime,
			purpose,
			attendees,
			email,
			tel,
			day_of_week: date.toLocaleDateString('ko-KR', { weekday: 'long' })
		};
		dispatch('submit', formData);
	}

	// 취소
	function cancel() {
		dispatch('cancel');
	}
</script>

<div class="space-y-6">
	<!-- 날짜 표시 -->
	<div>
		<label for="reservation_date" class="block text-sm font-medium text-gray-700">예약 날짜</label>
		<div class="mt-1 text-lg font-semibold text-gray-800">
			{date.toLocaleDateString('ko-KR', {
				month: 'numeric',
				day: 'numeric',
				weekday: 'short'
			})}
		</div>
	</div>

	<!-- 강의실 정보 -->
	<div>
		<label for="classroom" class="block text-sm font-medium text-gray-700">강의실</label>
		<div class="mt-1 text-lg font-semibold text-gray-800">
			{classroom.classroom.room_number || classroom.classroom.classroom_id}
		</div>
	</div>

	<!-- 시작 시간 -->
	<div>
		<label for="start_time" class="block text-sm font-medium text-gray-700">시작 시간</label>
		<div class="mt-1 text-lg font-semibold text-gray-800">
			{classroom.slot.start.slice(0, 5)}
		</div>
	</div>

	<!-- 종료 시간 선택 -->
	<div>
		<label for="end_time" class="block text-sm font-medium text-gray-700">예약 시간</label>
		<div class="mt-1 flex space-x-2">
			{#each durationOptions as option}
				{#if isTimeAvailable(classroom.slot.start, option.minutes)}
					<button
						on:click={() => selectDuration(option.minutes)}
						class="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-indigo-100"
						class:bg-indigo-500={endTime === minutesToTime(timeToMinutes(classroom.slot.start) + option.minutes)}
						class:text-white={endTime === minutesToTime(timeToMinutes(classroom.slot.start) + option.minutes)}
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

	<!-- 에러 메시지 -->
	{#if error}
		<div class="text-center text-red-500 bg-red-100 p-4 rounded">
			<p>{error}</p>
		</div>
	{/if}

	<!-- 버튼 -->
	<div class="flex space-x-4">
		<button
			on:click={submit}
			class="flex-1 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-gray-400"
			disabled={!purpose || !attendees || !endTime}
		>
			예약 신청
		</button>
		<button
			on:click={cancel}
			class="flex-1 rounded-md bg-gray-500 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600"
		>
			취소
		</button>
	</div>
</div>