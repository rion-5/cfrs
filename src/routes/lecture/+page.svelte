<!-- src/routes/lecture/+page.svelte -->
<script lang="ts">
	import { auth } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import DatePicker from '$lib/components/DatePicker.svelte';
	import TimeSlider from '$lib/components/TimeSlider.svelte';
	import Timetable from '$lib/components/Timetable.svelte';
	import ReservationForm from '$lib/components/ReservationForm.svelte';
	import { reservationStore } from '$lib/stores/reservation';
	import { formatDateToYYYYMMDD } from '$lib/utils/date';
	import type {
		ClassroomAvailability,
		ClassroomReservation,
		ReservationFormData
	} from '$lib/types';

	// 상태 관리
	let view: 'search' | 'timetable' | 'form' | 'confirmation' = 'search';
	let selectedDate: Date = new Date();
	let selectedTimeRange: { start: string; end: string } = { start: '09:00', end: '22:00' };
	let selectedClassroom: {
		classroom: ClassroomAvailability;
		slot: { start: string; end: string };
	} | null = null;
	let reservationResult: ClassroomReservation | null = null;
	let isLoading = false;
	let error: string | null = null;
	let userId: string | null = null;

	// DatePicker change 이벤트 처리
	async function handleDateChange(event: CustomEvent<Date>) {
		selectedDate = event.detail;
		if (userId) {
			await fetchAvailability();
		}
	}

	// 빈 강의실 및 예약 정보 조회
	async function fetchAvailability() {
		isLoading = true;
		try {
			// 가용성 조회
			console.log(`selectedDate ${formatDateToYYYYMMDD(selectedDate)} selectedTimeRange.start ${selectedTimeRange.start} selectedTimeRange.end ${selectedTimeRange.end}` );
			const availResponse = await fetch(
				`/api/classroom-availability?date=${formatDateToYYYYMMDD(selectedDate)}&start=${selectedTimeRange.start}&end=${selectedTimeRange.end}`,
				{ credentials: 'include' }
			);
			if (!availResponse.ok) {
				if (availResponse.status === 401) {
					error = '세션이 만료되었습니다. 다시 로그인해주세요.';
					return;
				}
				const errorData = await availResponse.json();
				throw new Error(errorData.error || '강의실 조회에 실패했습니다.');
			}
			const availData: ClassroomAvailability[] = await availResponse.json();

			// 예약 정보 조회
			const resResponse = await fetch(
				`/api/classroom-reservations?date=${formatDateToYYYYMMDD(selectedDate)}&start=${selectedTimeRange.start}&end=${selectedTimeRange.end}`,
				{ credentials: 'include' }
			);
			if (!resResponse.ok) {
				const errorData = await resResponse.json();
				throw new Error(errorData.error || '예약 조회에 실패했습니다.');
			}
			const resData: ClassroomReservation[] = await resResponse.json();

			reservationStore.set({ availability: availData, reservations: resData });
			view = 'timetable';
			error = null;
		} catch (err) {
			error = err instanceof Error ? err.message : '강의실 조회에 실패했습니다.';
			view = 'search';
		} finally {
			isLoading = false;
		}
	}

	// 예약 신청
	async function handleReservation(data: ReservationFormData) {
		isLoading = true;
			try {
				const response = await fetch('/api/classroom-reservations', {
					method: 'POST',
					body: JSON.stringify(data),
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include'
				});
				if (!response.ok) {
					if (response.status === 401) {
						error = '세션이 만료되었습니다. 다시 로그인해주세요.';
						return;
					}
					const errorData = await response.json();
					throw new Error(errorData.error || '예약 신청에 실패했습니다.');
				}
				reservationResult = await response.json();
				view = 'confirmation';
				error = null;
			} catch (err) {
				error = err instanceof Error ? err.message : '예약 신청에 실패했습니다.';
			} finally {
				isLoading = false;
			}
		}
	

	// 예약 취소
	async function handleCancel(reservationId: number) {
		if (confirm(`취소하시겠습니까?`)) {
			if (!userId) {
				error = '로그인이 필요합니다.';
				return;
			}
			isLoading = true;
			try {
				const response = await fetch(
					`/api/classroom-reservations?reservation_id=${reservationId}`,
					{
						method: 'DELETE',
						credentials: 'include'
					}
				);
				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(errorData.error || '예약 취소에 실패했습니다.');
				}
				await fetchAvailability(); // 시간표 갱신
				error = null;
			} catch (err) {
				error = err instanceof Error ? err.message : '예약 취소에 실패했습니다.';
			} finally {
				isLoading = false;
			}
		}
	}

	// // 내 예약 내역으로 이동
	// function goToMyReservations() {
	// 	goto('/my-reservations');
	// }

	function goHome() {
		goto('/');
	}

	// 사용자 인증 상태 반응형 처리
	$: {
		userId = $auth.id_no;
		if (userId && browser && view === 'search') {
			// 초기 데이터 로드 방지
		}
	}
</script>

<main class="container mx-auto p-4">
	{#if isLoading}
		<div class="text-center">
			<svg class="mx-auto h-5 w-5 animate-spin" viewBox="0 0 24 24">
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
				></circle>
				<path
					class="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
				></path>
			</svg>
			<p>로딩 중...</p>
		</div>
	{:else if error}
		<div class="rounded bg-red-100 p-4 text-center text-red-500">
			<p>{error}</p>
		</div>
	{:else if view === 'search'}
		<h1 class="mb-4 text-center text-2xl font-bold">강의실 예약</h1>
		<DatePicker bind:selectedDate on:change={handleDateChange} />
		<TimeSlider bind:selectedTimeRange />
		<button class="mt-4 w-full rounded bg-blue-500 py-2 text-white" on:click={fetchAvailability}>
			빈 강의실 찾기
		</button>
		<!-- <div class="mt-2 flex justify-between">
			<a href="/my-reservations" class="text-blue-500">내 예약 내역</a>
		</div> -->
	{:else if view === 'timetable'}
		<h1 class="mb-4 text-center text-2xl font-bold">
			{formatDateToYYYYMMDD(selectedDate)} 빈 강의실
		</h1>
		<button class="mb-4 text-blue-500" on:click={() => (view = 'search')}>빈 강의실 찾기</button>
		<Timetable
			{selectedDate}
			{userId}
			on:select={({ detail }) => {
				selectedClassroom = detail;
				view = 'form';
			}}
			on:cancel={({ detail }) => handleCancel(detail.reservationId)}
		/>
	{:else if view === 'form' && selectedClassroom}
		<h1 class="mb-4 text-center text-2xl font-bold">예약 신청</h1>
		<ReservationForm
			classroom={selectedClassroom}
			date={selectedDate}
			on:submit={({ detail }) => handleReservation(detail)}
			on:cancel={() => (view = 'timetable')}
		/>
	{:else if view === 'confirmation' && reservationResult}
		<h1 class="mb-4 text-center text-2xl font-bold">예약 완료</h1>
		<div class="rounded bg-green-100 p-4">
			<p>예약 신청이 완료되었습니다.</p>
			<p>강의실: {reservationResult.classroom_id.slice(-3)}</p>
			<p>날짜: {reservationResult.reservation_date}</p>
			<p>
				시간: {reservationResult.start_time.slice(0,5)} ~ {reservationResult.end_time.slice(0,5)}
			</p>
			<p>목적: {reservationResult.purpose}</p>
			<!-- <p>상태: {reservationResult.status}</p> -->
		</div>
		<div class="mt-4 flex justify-between">
			<!-- <button class="rounded bg-blue-500 px-4 py-2 text-white" on:click={goToMyReservations}>
				내 예약 내역
			</button> -->
			<button class="rounded bg-gray-500 px-4 py-2 text-white" on:click={() => (view = 'search')}>
			  빈 강의실 찾기
			</button>
		</div>
	{/if}
</main>
